// Mux Webhooks are imported dynamically to avoid type export issues
// import { Webhooks } from '@mux/mux-node';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { sendBorrowRequestNotification } from '@/lib/twilio';

export async function POST(request: NextRequest) {
  console.log('🎬 Mux webhook received at:', new Date().toISOString());
  try {
    // Check environment variables
    if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
      console.log(
        '❌ Missing MUX_TOKEN_ID or MUX_TOKEN_SECRET, skipping webhook'
      );
      return NextResponse.json({ ok: true });
    }

    // Check for webhook secret
    if (!process.env.MUX_WEBHOOK_SECRET) {
      console.log('❌ Missing MUX_WEBHOOK_SECRET environment variable');
      return NextResponse.json(
        { error: 'Missing webhook secret' },
        { status: 400 }
      );
    }

    // Verify webhook signature using the raw body
    const signature =
      request.headers.get('mux-signature') ||
      request.headers.get('Mux-Signature');

    console.log('🔐 Signature check:', {
      hasSignature: !!signature,
      signatureLength: signature?.length || 0,
      hasWebhookSecret: !!process.env.MUX_WEBHOOK_SECRET,
    });

    if (!signature) {
      console.log('❌ No Mux signature found in headers');
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    const rawBody = await request.text();
    console.log('📨 Webhook payload received:', {
      bodyLength: rawBody.length,
      bodyPreview: rawBody.substring(0, 200),
    });

    try {
      const { Webhooks } = await import('@mux/mux-node');
      Webhooks.verifyHeader(rawBody, signature, process.env.MUX_WEBHOOK_SECRET);
      console.log('✅ Webhook signature verified successfully');
    } catch (signatureError) {
      console.log('❌ Signature verification failed:', {
        error:
          signatureError instanceof Error
            ? signatureError.message
            : signatureError,
        signaturePreview: signature.substring(0, 20) + '...',
        bodyHash: rawBody.length,
      });
      return NextResponse.json(
        { error: 'Signature verification failed' },
        { status: 400 }
      );
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload?.type as string | undefined;
    const data = payload?.data;

    console.log('📋 Webhook payload parsed:', {
      eventType,
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
    });

    if (eventType === 'video.asset.ready' && data) {
      const playbackId = data.playback_ids?.[0]?.id as string | undefined;

      // Parse passthrough data that contains borrowRequestId
      let passthroughData;
      try {
        passthroughData = JSON.parse(data.passthrough || '{}');
      } catch {
        console.error('Failed to parse passthrough data:', data.passthrough);
        return NextResponse.json({ ok: true });
      }

      const borrowRequestId = passthroughData.borrowRequestId;

      if (playbackId && borrowRequestId) {
        console.log(
          '🎬 Processing video.asset.ready for borrow request:',
          borrowRequestId
        );
        // Update borrow request with Mux playback URL
        const borrowRequest = await db.borrowRequest.update({
          where: { id: borrowRequestId },
          data: {
            videoUrl: `https://stream.mux.com/${playbackId}.m3u8`,
          },
          include: {
            borrower: { select: { name: true } },
            item: { select: { name: true, ownerId: true } },
          },
        });

        // Send notification to owner now that video is ready
        const owner = await db.user.findUnique({
          where: { id: borrowRequest.item.ownerId },
          select: { name: true, phone: true, email: true },
        });

        if (owner?.phone || owner?.email) {
          const approvalUrl = `${process.env.NEXTAUTH_URL}/borrow-approval/${borrowRequest.id}`;
          const notificationResult = await sendBorrowRequestNotification({
            ownerName: owner.name || 'Owner',
            ...(owner.phone && { ownerPhone: owner.phone }),
            ...(owner.email && { ownerEmail: owner.email }),
            borrowerName: borrowRequest.borrower.name || 'Someone',
            itemName: borrowRequest.item.name,
            approvalUrl,
          });

          if (notificationResult.success) {
            const methods = [];
            if (notificationResult.sms.success) methods.push('SMS');
            if (notificationResult.email.success) methods.push('email');
            console.log(
              `📱 Mux webhook notification sent via: ${methods.join(' and ')}`
            );
          } else {
            console.error('❌ Mux webhook notification failed:', {
              sms: notificationResult.sms.error,
              email: notificationResult.email.error,
            });
          }
        }
      }
    }

    // Handle caption completion events
    if (eventType === 'video.asset.track.ready' && data) {
      const track = data;

      // Check if this is a generated caption track
      if (track.text_source === 'generated_vod') {
        // Parse passthrough data from the asset
        let passthroughData;
        try {
          passthroughData = JSON.parse(data.passthrough || '{}');
        } catch {
          console.error(
            'Failed to parse passthrough data for captions:',
            data.passthrough
          );
          return NextResponse.json({ ok: true });
        }

        const borrowRequestId = passthroughData.borrowRequestId;

        if (borrowRequestId) {
          console.log(
            '📝 Auto-generated captions ready for borrow request:',
            borrowRequestId,
            'Track ID:',
            track.id
          );
          // Captions are now available and will be automatically served with the video
          // No additional database updates needed as Mux handles caption delivery
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Mux webhook error:', error);
    return NextResponse.json({ ok: true });
  }
}

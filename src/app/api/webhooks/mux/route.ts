// Mux Webhooks are imported dynamically to avoid type export issues
// import { Webhooks } from '@mux/mux-node';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { sendBorrowRequestNotification } from '@/lib/twilio';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
      return NextResponse.json({ ok: true });
    }

    // Verify webhook signature using the raw body
    const signature =
      request.headers.get('mux-signature') ||
      request.headers.get('Mux-Signature');
    if (!signature || !process.env.MUX_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const rawBody = await request.text();
    try {
      const muxNode: any = await import('@mux/mux-node');
      muxNode.Webhooks.verifyHeader(
        rawBody,
        signature,
        process.env.MUX_WEBHOOK_SECRET
      );
    } catch {
      return NextResponse.json(
        { error: 'Signature verification failed' },
        { status: 400 }
      );
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload?.type as string | undefined;
    const data = payload?.data;

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

        // Send SMS to owner now that video is ready
        const owner = await db.user.findUnique({
          where: { id: borrowRequest.item.ownerId },
          select: { name: true, phone: true },
        });

        if (owner?.phone) {
          const approvalUrl = `${process.env.NEXTAUTH_URL}/borrow-approval/${borrowRequest.responseToken}`;
          await sendBorrowRequestNotification({
            _ownerName: owner.name || 'Owner',
            ownerPhone: owner.phone,
            borrowerName: borrowRequest.borrower.name || 'Someone',
            itemName: borrowRequest.item.name,
            approvalUrl,
          });
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

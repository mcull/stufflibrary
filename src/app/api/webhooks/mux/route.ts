import { NextRequest, NextResponse } from 'next/server';
// import Mux from '@mux/mux-node';

import { db } from '@/lib/db';
import { sendBorrowRequestNotification } from '@/lib/twilio';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
      return NextResponse.json({ ok: true });
    }

    const payload = await request.json();
    const eventType = payload?.type as string | undefined;
    const data = payload?.data;

    if (eventType === 'video.asset.ready' && data) {
      const playbackId = data.playback_ids?.[0]?.id as string | undefined;
      const borrowRequestId = (data.passthrough as string) || undefined;

      if (playbackId && borrowRequestId) {
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Mux webhook error:', error);
    return NextResponse.json({ ok: true });
  }
}

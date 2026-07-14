import { NextResponse } from 'next/server';

import { nudgeDecision } from '@/lib/admin/desk';
import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { createNotification } from '@/lib/notification-service';

// The desk's bell: REMIND OWNER on a request that has sat over a day,
// NUDGE on an overdue loan. nudgeDecision (pure, tested) decides which —
// this route only carries the notification. lastOverdueReminderAt is the
// shared throttle ledger: admin nudges and the overdue cron both write it,
// so a member is never dinged twice in a day from two directions.

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ borrowId: string }> }
) {
  try {
    await requireAdminAuth();

    const { borrowId } = await params;
    const borrow = await db.borrowRequest.findUnique({
      where: { id: borrowId },
      select: {
        id: true,
        status: true,
        createdAt: true,
        requestedReturnDate: true,
        lastOverdueReminderAt: true,
        borrowerId: true,
        lenderId: true,
        borrower: { select: { name: true } },
        item: { select: { name: true } },
      },
    });
    if (!borrow) {
      return NextResponse.json({ error: 'borrow not found' }, { status: 404 });
    }

    const decision = nudgeDecision(borrow, new Date());
    if (!decision) {
      return NextResponse.json({ error: 'nothing to nudge' }, { status: 409 });
    }
    if (decision.throttled) {
      return NextResponse.json(
        {
          error: 'reminded recently',
          lastOverdueReminderAt: borrow.lastOverdueReminderAt,
        },
        { status: 429 }
      );
    }

    const itemName = borrow.item?.name ?? 'an item';
    if (decision.kind === 'REMIND_OWNER') {
      const borrowerName = borrow.borrower?.name ?? 'A neighbor';
      const since = borrow.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      await createNotification({
        userId: borrow.lenderId,
        type: 'BORROW_REQUEST_RECEIVED',
        title: `Still waiting: ${borrowerName} asked to borrow ${itemName}`,
        message: `A gentle reminder from the front desk — ${borrowerName}'s request has been waiting since ${since}.`,
        // Same door the original request pointed the lender at.
        actionUrl: `/borrow-approval/${borrow.id}`,
        relatedRequestId: borrow.id,
      });
    } else {
      // Word-for-word the overdue cron's reminder: an admin nudge and a
      // system reminder must read the same to the member.
      await createNotification({
        userId: borrow.borrowerId,
        type: 'ITEM_OVERDUE',
        title: 'Item overdue',
        message: `"${itemName}" is past its return date. Please return it.`,
        relatedRequestId: borrow.id,
      });
    }

    await db.borrowRequest.update({
      where: { id: borrow.id },
      data: { lastOverdueReminderAt: new Date() },
    });

    return NextResponse.json({ ok: true, kind: decision.kind });
  } catch (error) {
    console.error('Admin borrow nudge error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Access denied' },
      { status: 401 }
    );
  }
}

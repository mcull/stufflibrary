import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { createNotification } from '@/lib/notification-service';
import { selectOverdueReminders } from '@/lib/overdue';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const active = await db.borrowRequest.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      status: true,
      borrowerId: true,
      lenderId: true,
      requestedReturnDate: true,
      lastOverdueReminderAt: true,
      item: { select: { name: true } },
    },
  });

  const reminders = selectOverdueReminders(active, Date.now());
  const byId = new Map(active.map((b) => [b.id, b]));

  for (const r of reminders) {
    const b = byId.get(r.id);
    if (!b) continue;
    const itemName = b.item?.name ?? 'an item';
    const overdue = r.kind === 'OVERDUE';
    await createNotification({
      userId: b.borrowerId,
      type: overdue ? 'ITEM_OVERDUE' : 'ITEM_DUE_TOMORROW',
      title: overdue ? 'Item overdue' : 'Item due tomorrow',
      message: overdue
        ? `"${itemName}" is past its return date. Please return it.`
        : `"${itemName}" is due back tomorrow.`,
    });
    await db.borrowRequest.update({
      where: { id: b.id },
      data: { lastOverdueReminderAt: new Date() },
    });
  }

  return NextResponse.json({ processed: reminders.length });
}

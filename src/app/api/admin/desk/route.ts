import { NextResponse } from 'next/server';

import { fillDailyBuckets } from '@/lib/admin/desk';
import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';

// Mirrors the parsing in src/lib/spend-cap.ts (not imported: it pulls in redis).
const DEFAULT_DAILY_CAP_CENTS = 1000;

function dailyCapCents(): number {
  const raw = process.env.DAILY_SPEND_CAP_CENTS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_DAILY_CAP_CENTS;
}

export async function GET() {
  try {
    await requireAdminAuth();

    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekAgo = new Date(now.getTime() - 7 * dayMs);
    const monthAgo = new Date(now.getTime() - 30 * dayMs);

    const [
      members,
      membersWeekDelta,
      activeLibraries,
      librariesMonthDelta,
      newLibraries7d,
      itemsOnShelves,
      itemsWithWatercolor,
      borrowsInFlight,
      overdueBorrows,
      invitesSent30d,
      invitesAccepted30d,
      invitesPending,
      openReports,
      activeDisputes,
      signupRows,
      paintRows,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { createdAt: { gte: weekAgo } } }),
      db.collection.count(),
      db.collection.count({ where: { createdAt: { gte: monthAgo } } }),
      db.collection.count({ where: { createdAt: { gte: weekAgo } } }),
      db.item.count(),
      db.item.count({ where: { watercolorUrl: { not: null } } }),
      db.borrowRequest.count({
        where: { status: { in: ['APPROVED', 'ACTIVE', 'RETURN_PENDING'] } },
      }),
      db.borrowRequest.count({
        where: { status: 'ACTIVE', requestedReturnDate: { lt: now } },
      }),
      db.invitation.count({ where: { sentAt: { gte: monthAgo } } }),
      db.invitation.count({ where: { acceptedAt: { gte: monthAgo } } }),
      db.invitation.count({
        where: { sentAt: { not: null }, acceptedAt: null },
      }),
      db.userReport.count({ where: { status: 'PENDING' } }),
      db.dispute.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      db.$queryRaw<Array<{ d: Date; c: number | bigint }>>`
        SELECT date_trunc('day', "createdAt") AS d, count(*)::int AS c
        FROM users
        WHERE "createdAt" >= now() - interval '30 days'
        GROUP BY 1
      `,
      // month_cents sums ALL AI_RENDER rows (money spent is money spent);
      // renders counts only successful ones, consistent with the ledger.
      db.$queryRaw<Array<{ month_cents: number; renders: number }>>`
        SELECT
          COALESCE(SUM((metadata->>'cost_cents')::int), 0)::int AS month_cents,
          COUNT(*) FILTER (WHERE metadata->>'status' = 'ok')::int AS renders
        FROM audit_logs
        WHERE action = 'AI_RENDER' AND "createdAt" >= date_trunc('month', now())
      `,
    ]);

    const daily = fillDailyBuckets(signupRows, 30, now);
    const paint = paintRows[0];

    return NextResponse.json({
      kpis: {
        members,
        membersWeekDelta,
        activeLibraries,
        librariesMonthDelta,
        itemsOnShelves,
        watercolorPct: Math.round(
          (100 * itemsWithWatercolor) / Math.max(1, itemsOnShelves)
        ),
        borrowsInFlight,
        overdueBorrows,
        invitesSent30d,
        invitesAccepted30d,
      },
      onDesk: { openReports, activeDisputes, overdueBorrows },
      growth: {
        daily,
        signupsToday: daily[daily.length - 1] ?? 0,
        invitesPending,
        newLibraries7d,
      },
      paint: {
        monthCents: Number(paint?.month_cents ?? 0),
        capCents: dailyCapCents(),
        renders: Number(paint?.renders ?? 0),
      },
    });
  } catch (error) {
    console.error('Admin desk aggregates fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Access denied' },
      { status: 401 }
    );
  }
}

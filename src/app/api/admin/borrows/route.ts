import { NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';

// The one source of truth for a board row; BorrowsBoardClient imports this
// type (type-only, erased at compile) so the two can't drift. Bucketing
// into columns happens client-side via borrowBoardColumn — the pure helper
// stays the single source of truth for the board's rules.
export interface AdminBorrowRow {
  id: string;
  status: string; // BorrowRequestStatus
  createdAt: string;
  approvedAt: string | null;
  requestedReturnDate: string;
  returnedAt: string | null;
  returnCondition: string | null; // ReturnCondition
  returnConditionNote: string | null;
  lastOverdueReminderAt: string | null;
  borrower: { name: string | null };
  lender: { name: string | null };
  item: { name: string };
}

const ROW_SELECT = {
  id: true,
  status: true,
  createdAt: true,
  approvedAt: true,
  requestedReturnDate: true,
  returnedAt: true,
  returnCondition: true,
  returnConditionNote: true,
  lastOverdueReminderAt: true,
  borrower: { select: { name: true } },
  lender: { select: { name: true } },
  item: { select: { name: true } },
} as const;

// Cap each query at 100 rows: the board is a glance, not an export. If a
// column ever hits the cap the counts read low — revisit with pagination.
const QUERY_CAP = 100;

export async function GET() {
  try {
    await requireAdminAuth();

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Two queries merged: every in-flight borrow, plus returns still inside
    // the 24h window (the footer's "returns leave the board after 24h" is
    // literally this where-clause).
    const [inFlight, returnedToday] = await Promise.all([
      db.borrowRequest.findMany({
        where: {
          status: { in: ['PENDING', 'APPROVED', 'ACTIVE', 'RETURN_PENDING'] },
        },
        select: ROW_SELECT,
        orderBy: { createdAt: 'desc' },
        take: QUERY_CAP,
      }),
      db.borrowRequest.findMany({
        where: { status: 'RETURNED', returnedAt: { gte: dayAgo } },
        select: ROW_SELECT,
        orderBy: { createdAt: 'desc' },
        take: QUERY_CAP,
      }),
    ]);

    // Dates serialize to ISO strings in the JSON body — the AdminBorrowRow shape.
    return NextResponse.json([...inFlight, ...returnedToday]);
  } catch (error) {
    console.error('Admin borrows fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Access denied' },
      { status: 401 }
    );
  }
}

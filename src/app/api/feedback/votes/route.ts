import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/feedback/votes?numbers=1,2,3
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id || null;

    const { searchParams } = new URL(request.url);
    const numbersParam = searchParams.get('numbers') || '';
    const numbers = numbersParam
      .split(',')
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => !Number.isNaN(n));

    if (numbers.length === 0) {
      return NextResponse.json({ votes: {} });
    }

    // Fetch counts per issueNumber
    const grouped = await db.feedbackVote.groupBy({
      by: ['issueNumber'],
      where: { issueNumber: { in: numbers } },
      _count: { _all: true },
    });

    const counts: Record<number, number> = {};
    grouped.forEach((g) => {
      counts[g.issueNumber] = g._count._all;
    });

    // Determine which issues the current user voted on
    let userVotes: Record<number, boolean> = {};
    if (userId) {
      const voted = await db.feedbackVote.findMany({
        where: { userId, issueNumber: { in: numbers } },
        select: { issueNumber: true },
      });
      userVotes = voted.reduce<Record<number, boolean>>((acc, v) => {
        acc[v.issueNumber] = true;
        return acc;
      }, {});
    }

    // Build map per number
    const result: Record<number, { count: number; userVoted: boolean }> = {};
    numbers.forEach((n) => {
      result[n] = {
        count: counts[n] || 0,
        userVoted: Boolean(userVotes[n]),
      };
    });

    return NextResponse.json({ votes: result });
  } catch (error) {
    console.error('Error fetching feedback votes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch votes' },
      { status: 500 }
    );
  }
}

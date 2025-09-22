import { Octokit } from '@octokit/rest';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { number } = await params;
    const issueNumber = parseInt(number, 10);
    if (!issueNumber || Number.isNaN(issueNumber)) {
      return NextResponse.json(
        { error: 'Invalid issue number' },
        { status: 400 }
      );
    }

    // Create internal vote if not exists
    await db.feedbackVote.upsert({
      where: {
        issueNumber_userId: {
          issueNumber,
          userId: session.user.id as string,
        },
      },
      create: {
        issueNumber,
        userId: session.user.id as string,
      },
      update: {},
    });

    // Count total internal votes for this issue
    const internalCount = await db.feedbackVote.count({
      where: { issueNumber },
    });

    // Best-effort GitHub +1 for discoverability (does not affect internal count)
    if (process.env.GITHUB_TOKEN) {
      const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
      try {
        await octokit.rest.reactions.createForIssue({
          owner: 'mcull',
          repo: 'stufflibrary',
          issue_number: issueNumber,
          content: '+1',
        });
      } catch (err: unknown) {
        const status = (err as any)?.status || 500;
        if (![200, 201, 409, 422].includes(status)) {
          console.warn('GitHub reaction create error:', err);
        }
      }
    }

    return NextResponse.json({ success: true, internalCount, userVoted: true });
  } catch (error) {
    console.error('Error upvoting issue:', error);
    return NextResponse.json(
      { error: 'Failed to upvote issue' },
      { status: 500 }
    );
  }
}

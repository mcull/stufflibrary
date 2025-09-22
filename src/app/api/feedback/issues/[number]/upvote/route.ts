import { Octokit } from '@octokit/rest';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json(
        { error: 'GitHub token not configured' },
        { status: 501 }
      );
    }

    const { number } = await params;
    const issueNumber = parseInt(number, 10);
    if (!issueNumber || Number.isNaN(issueNumber)) {
      return NextResponse.json(
        { error: 'Invalid issue number' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // Attempt to create a +1 reaction. If it already exists for the token user, ignore.
    try {
      await octokit.rest.reactions.createForIssue({
        owner: 'mcull',
        repo: 'stufflibrary',
        issue_number: issueNumber,
        content: '+1',
      });
    } catch (err: unknown) {
      // If already reacted or insufficient permissions, fall through with a graceful response
      const status = (err as any)?.status || 500;
      if (
        status !== 200 &&
        status !== 201 &&
        status !== 409 &&
        status !== 422
      ) {
        // 409/422 may indicate duplicate or not allowed; treat as non-fatal for UX
        console.warn('GitHub reaction create error:', err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error upvoting issue:', error);
    return NextResponse.json(
      { error: 'Failed to upvote issue' },
      { status: 500 }
    );
  }
}

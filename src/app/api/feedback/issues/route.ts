import { Octokit } from '@octokit/rest';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    // If no token configured, return an empty list gracefully (dev fallback)
    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json([]);
    }

    // Initialize client at request time to avoid build-time errors
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    // Fetch issues (open and closed) with the 'user-feedback' label
    const response = await octokit.rest.issues.listForRepo({
      owner: 'mcull',
      repo: 'stufflibrary',
      labels: 'user-feedback',
      state: 'all',
      sort: 'created',
      direction: 'desc',
      per_page: 50,
    });

    // Format the issues for the frontend
    const issues = response.data.map((issue) => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body || '',
      state: issue.state,
      closed_at: issue.closed_at,
      created_at: issue.created_at,
      labels: issue.labels.map((label) => ({
        name: typeof label === 'string' ? label : label.name || '',
        color: typeof label === 'string' ? '666666' : label.color || '666666',
      })),
      reactions: {
        '+1': issue.reactions?.['+1'] || 0,
      },
      html_url: issue.html_url,
    }));

    return NextResponse.json(issues);
  } catch (error: unknown) {
    // Graceful fallback in dev when token is invalid/insufficient
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    if (status === 401 || status === 403) {
      console.warn(
        'GitHub auth missing/insufficient for issues listing; returning empty list'
      );
      return NextResponse.json([]);
    }
    console.error('Error fetching GitHub issues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch issues' },
      { status: 500 }
    );
  }
}

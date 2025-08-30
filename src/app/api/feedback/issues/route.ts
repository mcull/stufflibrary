import { Octokit } from '@octokit/rest';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    // Initialize client at request time to avoid build-time errors
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
    // Fetch open issues with the 'user-feedback' label
    const response = await octokit.rest.issues.listForRepo({
      owner: 'mcull',
      repo: 'stufflibrary',
      labels: 'user-feedback',
      state: 'open',
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
  } catch (error) {
    console.error('Error fetching GitHub issues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch issues' },
      { status: 500 }
    );
  }
}

import { Octokit } from '@octokit/rest';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

import { feedbackResolvedEmailHTML } from '@/emails/feedbackResolvedEmail';
import { db } from '@/lib/db';
import { parseFeedbackSlug } from '@/lib/feedback-slug';

function pickEnv(body: unknown): string {
  const b = body as any;
  const env: unknown =
    b?.target ||
    b?.deployment?.target ||
    b?.environment ||
    b?.payload?.deployment?.target;
  return typeof env === 'string' && env.length > 0 ? env : 'production';
}

function pickSha(body: unknown): string | null {
  const b = body as any;
  const sha: unknown =
    b?.deployment?.meta?.githubCommitSha ||
    b?.deployment?.commit ||
    b?.commitSha ||
    b?.commit ||
    b?.payload?.deployment?.meta?.githubCommitSha;
  return typeof sha === 'string' && sha.length > 0 ? sha : null;
}

const CLOSE_REGEX = /(close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization') || '';
    const secret = process.env.WEBHOOK_SECRET || '';
    if (!secret || auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json(
        { error: 'GITHUB_TOKEN not configured' },
        { status: 501 }
      );
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY not configured' },
        { status: 501 }
      );
    }

    const body: any = await request.json().catch(() => ({}) as any);
    const env = pickEnv(body);
    const currentSha = pickSha(body);
    if (!currentSha) {
      return NextResponse.json(
        { error: 'Missing commit SHA in payload' },
        { status: 400 }
      );
    }

    // Get previous SHA for this environment
    const marker = await db.deployMarker.findUnique({ where: { env } });
    if (!marker) {
      // First run: store current and exit without notifications
      await db.deployMarker.upsert({
        where: { env },
        create: { env, lastSha: currentSha },
        update: { lastSha: currentSha },
      });
      return NextResponse.json({
        ok: true,
        message: 'Initialized deploy marker; no prior SHA',
      });
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = 'mcull';
    const repo = 'stufflibrary';

    // Compare commits between last and current
    let commits: Array<{ sha: string }> = [];
    try {
      const cmp = await octokit.repos.compareCommitsWithBasehead({
        owner,
        repo,
        basehead: `${marker.lastSha}...${currentSha}`,
      });
      commits = (cmp.data.commits || []).map((c: any) => ({ sha: c.sha }));
      // Include head if no commits array provided
      if (!commits.length) commits = [{ sha: currentSha }];
    } catch {
      // Fallback: just use current sha
      commits = [{ sha: currentSha }];
    }

    // Collect PRs and derive closed issue numbers
    const issueNumbers = new Set<number>();
    for (const c of commits) {
      try {
        const prs = await octokit.repos.listPullRequestsAssociatedWithCommit({
          owner,
          repo,
          commit_sha: c.sha,
        });
        for (const pr of prs.data) {
          // Only consider merged PRs
          if (!pr.merged_at) continue;
          const text = `${pr.title}\n\n${pr.body || ''}`;
          let m: RegExpExecArray | null;
          while ((m = CLOSE_REGEX.exec(text)) !== null) {
            const numStr = (m[2] ?? '').toString();
            if (!numStr) continue;
            const num = parseInt(numStr, 10);
            if (!Number.isNaN(num)) issueNumbers.add(num);
          }
        }
      } catch {
        // ignore per-commit errors
      }
    }

    const resend = new Resend(process.env.RESEND_API_KEY!);
    const results: Array<{ issue: number; emailed: boolean; error?: string }> =
      [];

    // For each issue number, fetch issue, parse slug, lookup user, send email
    for (const num of issueNumbers) {
      try {
        const issue = await octokit.issues.get({
          owner,
          repo,
          issue_number: num,
        });
        const title = issue.data.title || `Feedback #${num}`;
        const issueUrl = issue.data.html_url || '';
        const bodyText = issue.data.body || '';
        const match = bodyText.match(/SLFB:v1:[a-zA-Z0-9_-]+:[a-f0-9]{8}/);
        if (!match) {
          results.push({ issue: num, emailed: false, error: 'No slug' });
          continue;
        }
        const parsed = parseFeedbackSlug(match[0]);
        if (!parsed) {
          results.push({ issue: num, emailed: false, error: 'Bad slug' });
          continue;
        }
        const user = await db.user.findUnique({ where: { id: parsed.userId } });
        if (!user?.email) {
          results.push({ issue: num, emailed: false, error: 'User not found' });
          continue;
        }
        const html = feedbackResolvedEmailHTML({
          userName: user.name || 'there',
          issueNumber: num,
          issueUrl,
          issueTitle: title,
        });
        await resend.emails.send({
          from: 'StuffLibrary <feedback@stufflibrary.org>',
          to: user.email,
          subject: `We’ve addressed your feedback (#${num})`,
          html,
        });
        results.push({ issue: num, emailed: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'error';
        results.push({ issue: num, emailed: false, error: String(msg) });
      }
    }

    // Update marker to current SHA regardless of individual email outcomes
    await db.deployMarker.update({
      where: { env },
      data: { lastSha: currentSha },
    });

    return NextResponse.json({
      ok: true,
      env,
      from: marker.lastSha,
      to: currentSha,
      notified: results,
    });
  } catch (err) {
    console.error('vercel-deploy webhook error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

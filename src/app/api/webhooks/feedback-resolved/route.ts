import crypto from 'crypto';

import { Octokit } from '@octokit/rest';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

import { feedbackResolvedEmailHTML } from '@/emails/feedbackResolvedEmail';
import { db } from '@/lib/db';
import { parseFeedbackSlug } from '@/lib/feedback-slug';

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.WEBHOOK_SECRET || '';
    if (!secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Accept either Authorization: Bearer <secret> or x-vercel-signature (HMAC-SHA1 of raw body)
    const authHeader = request.headers.get('authorization') || '';
    const sigHeaderRaw = request.headers.get('x-vercel-signature') || '';
    let sigHeader = sigHeaderRaw;
    if (sigHeader.startsWith('sha1=')) sigHeader = sigHeader.slice(5);

    const raw = await request.text();
    const computed = crypto
      .createHmac('sha1', secret)
      .update(raw)
      .digest('hex');
    const authorized =
      authHeader === `Bearer ${secret}` ||
      (sigHeader &&
        sigHeader.length === computed.length &&
        crypto.timingSafeEqual(Buffer.from(sigHeader), Buffer.from(computed)));

    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: any = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      body = {};
    }
    const issueNumber = parseInt(body?.issueNumber, 10);
    if (!issueNumber || Number.isNaN(issueNumber)) {
      return NextResponse.json(
        { error: 'issueNumber is required' },
        { status: 400 }
      );
    }

    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json(
        { error: 'GitHub not configured' },
        { status: 501 }
      );
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const issue = await octokit.rest.issues.get({
      owner: 'mcull',
      repo: 'stufflibrary',
      issue_number: issueNumber,
    });

    const title = issue.data.title || `Feedback #${issueNumber}`;
    const issueUrl = issue.data.html_url || '';
    const bodyText = issue.data.body || '';

    // Find slug in body e.g., SLFB:v1:<userId>:<sig>
    const match = bodyText.match(/SLFB:v1:[a-zA-Z0-9_-]+:[a-f0-9]{8}/);
    if (!match) {
      return NextResponse.json(
        { error: 'No feedback slug found in issue body' },
        { status: 400 }
      );
    }

    const slug = match[0];
    const parsed = parseFeedbackSlug(slug);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid feedback slug' },
        { status: 400 }
      );
    }

    // Load user
    const user = await db.user.findUnique({ where: { id: parsed.userId } });
    if (!user?.email) {
      return NextResponse.json(
        { error: 'User not found for slug' },
        { status: 404 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Email not configured' },
        { status: 501 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const html = feedbackResolvedEmailHTML({
      userName: user.name || 'there',
      issueNumber,
      issueUrl,
      issueTitle: title,
    });

    await resend.emails.send({
      from: 'StuffLibrary <feedback@stufflibrary.org>',
      to: user.email,
      subject: `We’ve addressed your feedback (#${issueNumber})`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('feedback-resolved webhook error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

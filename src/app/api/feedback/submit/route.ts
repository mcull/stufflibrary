import { Octokit } from '@octokit/rest';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import OpenAI from 'openai';
import { Resend } from 'resend';

import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Initialize clients at request time to avoid build-time errors
    const hasGitHub = !!process.env.GITHUB_TOKEN;
    const octokit = hasGitHub
      ? new Octokit({ auth: process.env.GITHUB_TOKEN })
      : null;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { type, message } = await request.json();

    if (!message || !type) {
      return NextResponse.json(
        { error: 'Message and type are required' },
        { status: 400 }
      );
    }

    // Generate enhanced issue details using OpenAI
    const enhancementPrompt = `You are helping to improve a community sharing platform called StuffLibrary where neighbors share tools, equipment, and household items.

A user submitted this feedback:
Type: ${type}
Message: ${message}

Please provide:
1. A clear, concise title (max 60 characters)
2. A priority level (P0=Critical, P1=High, P2=Medium, P3=Low, P4=Nice to have, P5=Future consideration)
3. A brief, whimsical but helpful comment (1-2 sentences) that shows appreciation for the feedback

Format your response as JSON:
{
  "title": "...",
  "priority": "P0-P5",
  "comment": "..."
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: enhancementPrompt }],
      temperature: 0.7,
    });

    let enhancement;
    try {
      const content = completion.choices[0]?.message?.content;
      enhancement = content ? JSON.parse(content) : {};
    } catch {
      // Fallback if OpenAI response isn't valid JSON
      enhancement = {
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} feedback`,
        priority: 'P3',
        comment: 'Thanks for helping us improve StuffLibrary! 🙌',
      };
    }

    // Create the issue body
    const issueBody = `## User Feedback

**Type:** ${type.charAt(0).toUpperCase() + type.slice(1)}
**Submitted by:** ${session.user.email}
**Priority:** ${enhancement.priority}

---

${message}

---

_${enhancement.comment}_

**Internal Notes:**
- Auto-generated from feedback form
- User should receive email updates on this issue
`;

    // Create GitHub issue (graceful fallback if token missing/invalid)
    let issue: any = null;
    if (octokit) {
      try {
        issue = await octokit.rest.issues.create({
          owner: 'mcull',
          repo: 'stufflibrary',
          title: enhancement.title,
          body: issueBody,
          labels: [
            'user-feedback',
            `priority-${enhancement.priority.toLowerCase()}`,
            `type-${type}`,
          ],
        });
      } catch (ghErr: any) {
        const status = ghErr?.status || 500;
        if (status === 401 || status === 403) {
          console.warn(
            'GitHub token missing or insufficient; skipping issue creation'
          );
        } else {
          console.error('Error creating GitHub issue:', ghErr);
        }
      }
    } else {
      console.warn('GITHUB_TOKEN not set; skipping GitHub issue creation');
    }

    // Send email notification
    await sendFeedbackEmail({
      userEmail: session.user.email,
      userName: session.user.name || 'StuffLibrary User',
      feedbackType: type,
      issueUrl: issue?.data?.html_url || '#',
      issueNumber: issue?.data?.number || 0,
      resend,
    });

    return NextResponse.json({
      success: true,
      issueUrl: issue?.data?.html_url || null,
      issueNumber: issue?.data?.number || null,
      createdIssue: Boolean(issue),
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

async function sendFeedbackEmail({
  userEmail,
  userName,
  feedbackType,
  issueUrl,
  issueNumber,
  resend,
}: {
  userEmail: string;
  userName: string;
  feedbackType: string;
  issueUrl: string;
  issueNumber: number;
  resend: any;
}) {
  try {
    const typeDescription =
      feedbackType === 'bug'
        ? 'bug report'
        : feedbackType === 'feature'
          ? 'feature request'
          : 'improvement suggestion';

    // Send email to both feedback@stufflibrary.org and the user
    const emailResponse = await resend.emails.send({
      from: 'StuffLibrary <feedback@stufflibrary.org>',
      to: [userEmail, 'feedback@stufflibrary.org'],
      subject: `Thank you for your ${typeDescription} - Issue #${issueNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Thank You!</h1>
          </div>
          
          <div style="padding: 30px; background: white; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hi ${userName},</p>
            
            <p style="color: #666; line-height: 1.6;">Thank you for taking the time to share your ${typeDescription} with us! Your input helps make StuffLibrary better for everyone in our community.</p>
            
            <div style="background: #f8f9ff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #667eea;">
              <h3 style="margin: 0 0 10px 0; color: #333;">📋 Your Feedback Tracking</h3>
              <p style="margin: 0; color: #666;"><strong>Issue #${issueNumber}</strong></p>
              <a href="${issueUrl}" target="_blank" style="display: inline-block; margin-top: 10px; padding: 8px 16px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-size: 14px;">View on GitHub →</a>
            </div>
            
            <div style="background: #f0f7ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h4 style="margin: 0 0 10px 0; color: #1e40af;">🔔 What happens next?</h4>
              <ul style="margin: 0; padding-left: 20px; color: #666; line-height: 1.6;">
                <li>Our team will review your feedback</li>
                <li>You'll get email updates on any progress</li>
                <li>We'll notify you when it's resolved or if we need more info</li>
              </ul>
            </div>
            
            <p style="color: #666; line-height: 1.6;">Your feedback is invaluable in making StuffLibrary the best community sharing platform it can be. Thank you for being part of our journey! ✨</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #333; font-weight: 600;">The StuffLibrary Team</p>
            </div>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
            <p>This email was sent because you submitted feedback on StuffLibrary.</p>
            <p>You can manage your notifications in your <a href="${process.env.NEXT_PUBLIC_APP_URL}/profile" style="color: #667eea;">profile settings</a>.</p>
          </div>
        </div>
      `,
    });

    console.log('Email sent successfully:', emailResponse);
    return emailResponse;
  } catch (error) {
    console.error('Failed to send feedback email:', error);
    // Don't throw error - feedback submission should still succeed even if email fails
    return null;
  }
}

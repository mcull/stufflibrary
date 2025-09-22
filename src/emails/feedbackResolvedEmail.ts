export function feedbackResolvedEmailHTML({
  userName,
  issueNumber,
  issueUrl,
  issueTitle,
}: {
  userName: string;
  issueNumber: number;
  issueUrl: string;
  issueTitle: string;
}) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2C5282 100%); padding: 28px; text-align: center; border-radius: 14px 14px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 22px;">StuffLibrary</h1>
        <p style="color: #E6F0FA; margin: 8px 0 0; font-size: 14px;">Community-powered sharing</p>
      </div>

      <div style="padding: 28px; background: white; border-radius: 0 0 14px 14px; box-shadow: 0 6px 18px rgba(0,0,0,0.08);">
        <p style="font-size: 16px; color: #1F2937; margin: 0 0 16px;">Hi ${
          userName || 'there'
        },</p>

        <h2 style="color: #111827; font-size: 18px; margin: 0 0 12px;">We’ve addressed your feedback 🎉</h2>
        <p style="color: #374151; margin: 0 0 16px; line-height: 1.6;">Thanks again for helping us improve StuffLibrary. The feedback you submitted is now resolved or updated:</p>

        <div style="background: #F8FAFD; padding: 16px; border-radius: 10px; border: 1px solid #E5E7EB;">
          <p style="margin: 0; color: #111827; font-weight: 600;">#${issueNumber} — ${issueTitle}</p>
          <a href="${issueUrl}" target="_blank" style="display: inline-block; margin-top: 10px; padding: 8px 14px; background: #1E3A5F; color: white; text-decoration: none; border-radius: 8px; font-size: 13px;">View details on GitHub →</a>
        </div>

        <p style="color: #4B5563; margin: 16px 0 0; line-height: 1.6;">Your ideas help us build a friendlier, more useful library for everyone. Thank you for being part of the journey!</p>

        <p style="color: #111827; font-weight: 600; margin: 24px 0 0;">The StuffLibrary Team</p>
      </div>

      <div style="text-align: center; padding: 16px; color: #9CA3AF; font-size: 12px;">
        <p style="margin: 0;">You received this email because you submitted feedback on StuffLibrary.</p>
      </div>
    </div>
  `;
}

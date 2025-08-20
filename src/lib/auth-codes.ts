import { Resend } from 'resend';

import { db } from './db';
import { env } from './env';

// Generate a 6-digit numeric code
export function generateAuthCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store auth code in database with expiration
export async function storeAuthCode(email: string, code: string): Promise<void> {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db.authCode.upsert({
    where: { email },
    update: {
      code,
      expiresAt,
      createdAt: new Date(),
    },
    create: {
      email,
      code,
      expiresAt,
    },
  });
}

// Verify auth code
export async function verifyAuthCode(email: string, code: string): Promise<boolean> {
  const authCode = await db.authCode.findUnique({
    where: { email },
  });

  if (!authCode) {
    return false;
  }

  // Check if code matches and hasn't expired
  if (authCode.code !== code || authCode.expiresAt < new Date()) {
    return false;
  }

  // Delete the code after successful verification
  await db.authCode.delete({
    where: { email },
  });

  return true;
}

// Send auth code via email
export async function sendAuthCode(email: string): Promise<void> {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const code = generateAuthCode();
  await storeAuthCode(email, code);

  const resend = new Resend(env.RESEND_API_KEY);
  
  await resend.emails.send({
    from: 'StuffLibrary <noreply@stufflibrary.org>',
    to: email,
    subject: 'Your StuffLibrary sign-in code',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1E3A5F; font-size: 24px; margin: 0;">StuffLibrary</h1>
        </div>
        
        <h2 style="color: #333333; font-size: 20px; margin-bottom: 16px;">Your sign-in code</h2>
        
        <p style="color: #333333; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
          Enter this code to sign in to your StuffLibrary account:
        </p>
        
        <div style="text-align: center; margin: 32px 0;">
          <div style="display: inline-block; background-color: #f8f9fa; border: 2px solid #e9ecef; border-radius: 8px; padding: 16px 24px; font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1E3A5F;">
            ${code}
          </div>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
          This code will expire in 10 minutes. If you didn't request this code, you can safely ignore this email.
        </p>
        
        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #6b7280; font-size: 12px;">
          Sent by StuffLibrary • Building stronger communities through sharing
        </div>
      </div>
    `,
    text: `Your StuffLibrary sign-in code: ${code}\n\nEnter this code to sign in to your account. This code will expire in 10 minutes.`,
  });
}
import { Resend } from 'resend';

import { db } from './db';
import { env } from './env';
import { buildMagicSignInLink } from './magic-link';

// Generate a 6-digit numeric code
export function generateAuthCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Normalize an email to a stable storage/lookup key. Codes are stored and
// verified under this key so casing/whitespace differences between the send
// and verify paths (e.g. iOS auto-capitalizing the address) can't cause a
// "code not found" miss.
export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Store auth code in database with expiration
export async function storeAuthCode(
  email: string,
  code: string
): Promise<void> {
  const key = normalizeAuthEmail(email);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db.authCode.upsert({
    where: { email: key },
    update: {
      code,
      expiresAt,
      createdAt: new Date(),
    },
    create: {
      email: key,
      code,
      expiresAt,
    },
  });
}

// Verify auth code
export async function verifyAuthCode(
  email: string,
  code: string
): Promise<boolean> {
  const key = normalizeAuthEmail(email);
  const authCode = await db.authCode.findUnique({
    where: { email: key },
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
    where: { email: key },
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
  const magicLink = buildMagicSignInLink(
    normalizeAuthEmail(email),
    code,
    process.env.NEXTAUTH_URL
  );

  // Magic-link-first: the button is the primary action; the code stays as the
  // fallback for the cross-device case (requested on one device, email read
  // on another — the code works anywhere, the button signs in this device).
  const buttonBlock = magicLink
    ? `
        <div style="text-align: center; margin: 28px 0 8px;">
          <a href="${magicLink}" style="display: inline-block; background-color: #1E3A5F; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Tap to sign in
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.5; text-align: center; margin-bottom: 24px;">
          Signing in on a different device? Enter this code instead:
        </p>`
    : `
        <p style="color: #333333; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
          Enter this code to sign in to your StuffLibrary account:
        </p>`;

  await resend.emails.send({
    from: 'StuffLibrary <noreply@stufflibrary.org>',
    to: email,
    subject: 'Your StuffLibrary sign-in code',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1E3A5F; font-size: 24px; margin: 0;">StuffLibrary</h1>
        </div>

        <h2 style="color: #333333; font-size: 20px; margin-bottom: 16px;">Sign in to StuffLibrary</h2>
        ${buttonBlock}
        <div style="text-align: center; margin: 8px 0 32px;">
          <div style="display: inline-block; background-color: #f8f9fa; border: 2px solid #e9ecef; border-radius: 8px; padding: 16px 24px; font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1E3A5F;">
            ${code}
          </div>
        </div>

        <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
          The button and code expire in 10 minutes and work once. If you didn't request this, you can safely ignore this email.
        </p>

        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #6b7280; font-size: 12px;">
          Sent by StuffLibrary • Building stronger communities through sharing
        </div>
      </div>
    `,
    text: magicLink
      ? `Sign in to StuffLibrary: ${magicLink}\n\nSigning in on a different device? Enter this code instead: ${code}\n\nThe link and code expire in 10 minutes and work once.`
      : `Your StuffLibrary sign-in code: ${code}\n\nEnter this code to sign in to your account. This code will expire in 10 minutes.`,
  });
}

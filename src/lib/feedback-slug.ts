import crypto from 'crypto';

const VERSION = 'v1';
const PREFIX = 'SLFB';

function getSecret() {
  return (
    process.env.FEEDBACK_SLUG_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'fallback-secret-do-not-use-in-prod'
  );
}

export function makeFeedbackSlug(userId: string) {
  const secret = getSecret();
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`${userId}|${PREFIX}|${VERSION}`)
    .digest('hex')
    .slice(0, 8);
  return `${PREFIX}:${VERSION}:${userId}:${sig}`;
}

export function parseFeedbackSlug(slug: string): { userId: string } | null {
  const parts = slug.split(':');
  if (parts.length !== 4) return null;
  const [prefix, version, userId, sig] = parts;
  if (prefix !== PREFIX || version !== VERSION || !userId || !sig) return null;
  const secret = getSecret();
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${userId}|${PREFIX}|${VERSION}`)
    .digest('hex')
    .slice(0, 8);
  if (sig !== expected) return null;
  return { userId };
}

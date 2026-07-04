// Pure, dependency-free on purpose: this must stay importable (and testable)
// without touching the db/env module graph.

/**
 * One-tap sign-in link: lands on the signin page's existing auto-complete
 * path, which submits the same single-use, 10-minute code. Returns null when
 * no base url is configured (the email then falls back to code-only).
 */
export function buildMagicSignInLink(
  email: string,
  code: string,
  baseUrl: string | undefined
): string | null {
  if (!baseUrl) return null;
  const params = new URLSearchParams({
    magic: 'true',
    auto: 'true',
    email,
    code,
  });
  return `${baseUrl.replace(/\/$/, '')}/auth/signin?${params.toString()}`;
}

/**
 * Post-auth routing has exactly one mandatory stop: /auth/callback, where the
 * invite cookie is consumed. A `?callbackUrl=` planted by a login-walled page
 * (e.g. /feedback) used to *replace* that stop, silently discarding a pending
 * invitation — the observed ending of the first real invite batch. Here the
 * requested destination is demoted to a `next=` fallback the callback honors
 * only after the consume attempt.
 */

/** A destination is safe only if it stays on this origin: a relative path,
 *  not protocol-relative. Anything else becomes null (= no destination). */
export function safeRelativePath(
  raw: string | null | undefined
): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/')) return null;
  if (raw.startsWith('//')) return null;
  // Browsers normalize a backslash into a forward slash in the authority
  // position (/\evil.example -> //evil.example), so a backslash anywhere can
  // smuggle an off-origin redirect past the `//` check above.
  if (raw.includes('\\')) return null;
  // Reject C0 control chars and DEL: URL parsing strips them before
  // resolving, and a path we build ourselves never legitimately contains one.
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    if (c <= 0x1f || c === 0x7f) return null;
  }
  return raw;
}

/** The one URL sign-in may hand NextAuth as callbackUrl. */
export function buildPostAuthCallbackUrl(opts: {
  requested?: string | null;
  invitationToken?: string | null;
  libraryId?: string | null;
}): string {
  const params = new URLSearchParams();
  if (opts.invitationToken) {
    params.set('invitation', opts.invitationToken);
    if (opts.libraryId) params.set('library', opts.libraryId);
  }
  const requested = safeRelativePath(opts.requested ?? null);
  // The callback pointing at itself would loop; treat it as no request.
  if (requested && !requested.startsWith('/auth/callback')) {
    params.set('next', requested);
  }
  const qs = params.toString();
  return qs ? `/auth/callback?${qs}` : '/auth/callback';
}

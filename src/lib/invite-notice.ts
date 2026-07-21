import { cookies } from 'next/headers';

import {
  maskEmail,
  parseJoinCodeCookie,
  validateLibraryInvite,
} from './invite';

/**
 * The invited address behind the pending invite cookie, masked.
 *
 * This is what the wrong-account dead end shows. It lives here rather than in
 * a query parameter for the same reason the plain address does: masked or not,
 * a URL lands in browser history and outbound `Referer`. Masking happens
 * server-side, so the refused browser is never sent the address it was refused
 * on behalf of.
 *
 * Returns null for a `jc:` cookie — a join code is bearer and has no addressee
 * to name — and for any invite that no longer validates.
 */
export async function maskedInvitedAddressFromCookies(): Promise<
  string | null
> {
  const token = (await cookies()).get('invite_token')?.value;
  if (!token || parseJoinCodeCookie(token)) return null;

  const validation = await validateLibraryInvite(token);
  return validation.ok ? maskEmail(validation.invitation.email) : null;
}

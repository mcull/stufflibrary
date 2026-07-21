import { type NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { parseJoinCodeCookie, validateLibraryInvite } from '@/lib/invite';

/**
 * What the pending invite cookie is for, read server-side.
 *
 * The sign-in page is a client component and cannot read an httpOnly cookie,
 * and the address must not travel in the URL — `?email=` would land in browser
 * history and outbound `Referer` headers. So it asks here instead.
 *
 * Returns nothing for a `jc:` cookie. A join code is bearer, addressed to
 * nobody; there is no address to prefill and inventing one would lock a
 * stranger's sign-in to somebody else's mailbox.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get('invite_token')?.value;
  if (!token || parseJoinCodeCookie(token)) {
    return NextResponse.json({ invite: null });
  }

  const validation = await validateLibraryInvite(token);
  if (!validation.ok) return NextResponse.json({ invite: null });

  const library = await db.collection.findUnique({
    where: { id: validation.invitation.libraryId },
    select: { name: true },
  });

  return NextResponse.json({
    invite: {
      email: validation.invitation.email,
      libraryName: library?.name ?? null,
    },
  });
}

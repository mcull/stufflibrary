import { type NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { handleInviteLanding, handleJoinCodeLanding } from '@/lib/invite';
import { normalizeJoinCode } from '@/lib/join-code';
import {
  isJoinLookupBlocked,
  recordJoinLookupFailure,
} from '@/lib/join-code-rate-limit';

function clientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * The printable front door: `/join/XKF7-2M9Q`, resolved against JoinCode
 * first and then `Invitation.shortCode`. Both columns are unique and indexed,
 * so a miss costs two lookups.
 *
 * The throttle is consulted BEFORE either lookup and updated only after a
 * miss. Order matters in both directions:
 *
 *   - Guard first, so a client past its budget costs us nothing and, more to
 *     the point, learns nothing. Checking afterwards would still serve every
 *     hit; a sweeper would take the 429s on misses and keep the oracle open.
 *   - Count only misses, so the corkboard flyer that fifty neighbours scan
 *     off one café's NAT does not throttle the fifty-first.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const ip = clientIp(request);
  if (await isJoinLookupBlocked(ip)) {
    return new NextResponse('Too many attempts', { status: 429 });
  }

  const { code } = await params;
  const normalized = normalizeJoinCode(code);

  const joinCodeResponse = await handleJoinCodeLanding(request, normalized);
  if (joinCodeResponse) return joinCodeResponse;

  const invitation = await db.invitation.findFirst({
    where: { shortCode: normalized },
    select: { token: true },
  });
  if (invitation?.token) {
    return handleInviteLanding(request, invitation.token);
  }

  await recordJoinLookupFailure(ip);
  return NextResponse.redirect(new URL('/?invite=invalid', request.url));
}

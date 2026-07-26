import { type NextRequest, NextResponse } from 'next/server';

import { clientIp } from '@/lib/client-ip';
import { shortCodeResolvesToLiveInvite } from '@/lib/invite';
import { normalizeJoinCode } from '@/lib/join-code';
import {
  isJoinLookupBlocked,
  recordJoinLookupFailure,
} from '@/lib/join-code-rate-limit';
import { resolveJoinCode } from '@/lib/join-code-service';

/**
 * Resolve-only twin of GET /join/[code]: says whether a typed code matches,
 * without redirecting, so an entry field can show an inline error instead of
 * bouncing a signed-in member out of their lobby.
 *
 * It shares the SAME failure throttle as /join and leaks only the one bit that
 * route's redirect target already leaks. Without the shared throttle this would
 * be a clean JSON enumeration oracle that /join is not — so the guard runs
 * first, and only a genuine miss spends budget.
 *
 * POST with a body (not the code in the path) keeps the bearer code out of
 * access logs. A malformed body is a 400, not a guess — it does not spend
 * throttle budget.
 */
export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (await isJoinLookupBlocked(ip)) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const code = body?.code;
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'A code is required' }, { status: 400 });
  }

  const normalized = normalizeJoinCode(code);

  const joinCode = await resolveJoinCode(normalized);
  if (joinCode) return NextResponse.json({ ok: true });

  if (await shortCodeResolvesToLiveInvite(normalized)) {
    return NextResponse.json({ ok: true });
  }

  await recordJoinLookupFailure(ip);
  return NextResponse.json({ ok: false });
}

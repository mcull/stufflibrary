import { type NextRequest } from 'next/server';

import { handleInviteLanding } from '@/lib/invite';

/**
 * Sunset (InviteFlows §6.3): this legacy entry point used to hand live
 * invites to /api/auth/magic-link, which auto-created the account from the
 * invitation's own email and auto-signed it in — authentication without any
 * proof from the invitee, contradicting the posture every current flow is
 * built on. Old emails still carry this URL, so the route stays alive as a
 * plain redirect into the current landing, where nobody is signed in without
 * typing a code. handleInviteLanding covers valid, expired, already-member,
 * and wrong-account uniformly.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  return handleInviteLanding(request, token);
}

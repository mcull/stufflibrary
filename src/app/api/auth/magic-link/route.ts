import { NextRequest, NextResponse } from 'next/server';

/**
 * Sunset (InviteFlows §6.3). This endpoint used to be the auto-sign-in half
 * of the legacy invite flow: upsert the user from the invitation's email,
 * mint a session, join the library — all from a bare link click. That is
 * authentication without any proof from the invitee, and it contradicted the
 * no-auto-sign-in posture the current flow is built on. It now forwards into
 * the current landing (/invite/<token>), where claiming a card always means
 * typing a code. Kept only so bookmarked URLs degrade gracefully; deletable
 * once old emails have aged out.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/?invite=invalid', request.url));
  }
  return NextResponse.redirect(
    new URL(`/invite/${encodeURIComponent(token)}`, request.url)
  );
}

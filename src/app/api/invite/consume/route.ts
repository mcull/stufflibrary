import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import {
  acceptInvitation,
  clearInviteCookies,
  emailMatchesInvitation,
  ensureActiveMembership,
  maskEmail,
  validateLibraryInvite,
} from '@/lib/invite';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log('[invite/consume] start', {
      url: request.url,
      hasSessionUser: !!session?.user,
      hasCookieInviteToken: !!request.cookies.get('invite_token')?.value,
      inviteLibrary: request.cookies.get('invite_library')?.value,
    });
    if (!session?.user) {
      console.log('[invite/consume] no session user');
      return NextResponse.json({ redirect: null }, { status: 200 });
    }

    const inviteToken = request.cookies.get('invite_token')?.value;
    const inviteLibrary = request.cookies.get('invite_library')?.value;
    if (!inviteToken || !inviteLibrary) {
      console.log('[invite/consume] missing cookies');
      return NextResponse.json({ redirect: null }, { status: 200 });
    }

    const userId = (session.user as { id?: string } | undefined)?.id;
    if (!userId) {
      console.log('[invite/consume] missing userId from session');
      return NextResponse.json({ redirect: null }, { status: 200 });
    }

    // Build base response now so we can always clear cookies
    const res = NextResponse.json({ redirect: `/library/${inviteLibrary}` });
    clearInviteCookies(res);

    // Validate invite
    const validation = await validateLibraryInvite(inviteToken);
    console.log('[invite/consume] invitation lookup', {
      found: validation.ok,
      expired: !validation.ok && validation.reason === 'expired',
    });

    if (!validation.ok) {
      // Naming the failure matters: silently redirecting drops the user at a
      // library they are not a member of, which is exactly what arriving on a
      // rotated-away code looks like.
      console.log(
        '[invite/consume] invite invalid or expired',
        validation.reason
      );
      const dead = NextResponse.json(
        { redirect: null, error: `invite_${validation.reason}` },
        { status: 200 }
      );
      clearInviteCookies(dead);
      return dead;
    }

    // Personal invitations are bound to their address. This cannot fail on the
    // prefilled sign-in path — that address was locked to the invitation — so
    // it exists for OAuth sign-in under another address and for a forwardee
    // arriving on a live 90-day session.
    //
    // Before ensureActiveMembership on purpose: a mismatch burns nothing and
    // grants nothing.
    const sessionEmail = (session.user as { email?: string }).email;
    if (!emailMatchesInvitation(sessionEmail, validation.invitation.email)) {
      console.log('[invite/consume] email does not match invitation; refusing');
      const refused = NextResponse.json(
        {
          redirect: null,
          error: 'invite_bound_to_other_email',
          invitedEmail: maskEmail(validation.invitation.email),
        },
        { status: 200 }
      );
      clearInviteCookies(refused);
      return refused;
    }

    // Ensure membership; only consume the invitation when this actually
    // added someone — an owner or existing member re-consuming must not
    // burn the invite for its real addressee (#409).
    const membership = await ensureActiveMembership(userId, inviteLibrary);

    if (membership.created || membership.reactivated) {
      console.log('[invite/consume] marking invite accepted');
      await acceptInvitation(inviteToken, inviteLibrary, userId);
    } else {
      console.log('[invite/consume] owner/existing member; invite left live');
    }

    console.log('[invite/consume] returning redirect', {
      to: `/library/${inviteLibrary}`,
    });
    return res;
  } catch (e) {
    console.error('[invite/consume] error', e);
    return NextResponse.json({ redirect: null }, { status: 200 });
  }
}

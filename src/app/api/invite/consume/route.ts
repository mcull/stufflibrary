import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import {
  acceptInvitation,
  clearInviteCookies,
  ensureActiveMembership,
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
    const res = NextResponse.json({ redirect: `/collection/${inviteLibrary}` });
    clearInviteCookies(res);

    // Validate invite
    const validation = await validateLibraryInvite(inviteToken);
    console.log('[invite/consume] invitation lookup', {
      found: validation.ok,
      expired: !validation.ok && validation.reason === 'expired',
    });

    if (!validation.ok) {
      console.log('[invite/consume] invalid or expired invite; returning');
      return res;
    }

    // Ensure membership
    await ensureActiveMembership(userId, inviteLibrary);

    // Mark invite accepted
    console.log('[invite/consume] marking invite accepted');
    await acceptInvitation(inviteToken, inviteLibrary, userId);

    console.log('[invite/consume] returning redirect', {
      to: `/collection/${inviteLibrary}`,
    });
    return res;
  } catch (e) {
    console.error('[invite/consume] error', e);
    return NextResponse.json({ redirect: null }, { status: 200 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log('[invite/complete-join] start', {
      hasSessionUser: !!session?.user,
      hasCookieInviteToken: !!request.cookies.get('invite_token')?.value,
      inviteLibrary: request.cookies.get('invite_library')?.value,
    });

    if (!session?.user) {
      console.log('[invite/complete-join] no session user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inviteToken = request.cookies.get('invite_token')?.value;
    const inviteLibrary = request.cookies.get('invite_library')?.value;
    if (!inviteToken || !inviteLibrary) {
      console.log('[invite/complete-join] missing cookies');
      return NextResponse.json(
        { success: false, error: 'No invite found' },
        { status: 400 }
      );
    }

    const userId = (session.user as { id?: string } | undefined)?.id;
    if (!userId) {
      console.log('[invite/complete-join] missing userId from session');
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    // Validate invite is still valid
    const invitation = await db.invitation.findFirst({
      where: {
        token: inviteToken,
        libraryId: inviteLibrary,
        type: 'library',
        status: { in: ['PENDING', 'SENT'] },
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    console.log('[invite/complete-join] invitation lookup', {
      found: !!invitation,
    });

    if (!invitation) {
      console.log('[invite/complete-join] invalid or expired invite');
      return NextResponse.json(
        { success: false, error: 'Invalid or expired invite' },
        { status: 400 }
      );
    }

    // Create or reactivate membership
    const existing = await db.collectionMember.findUnique({
      where: { userId_collectionId: { userId, collectionId: inviteLibrary } },
      select: { id: true, isActive: true },
    });

    if (!existing) {
      console.log('[invite/complete-join] creating membership', {
        userId,
        inviteLibrary,
      });
      await db.collectionMember.create({
        data: {
          userId,
          collectionId: inviteLibrary,
          role: 'member',
          isActive: true,
        },
      });
    } else if (!existing.isActive) {
      console.log('[invite/complete-join] reactivating membership', {
        id: existing.id,
      });
      await db.collectionMember.update({
        where: { id: existing.id },
        data: { isActive: true, joinedAt: new Date() },
      });
    } else {
      console.log('[invite/complete-join] membership already active');
    }

    // Mark invite accepted
    console.log('[invite/complete-join] marking invite accepted');
    await db.invitation.updateMany({
      where: { token: inviteToken, libraryId: inviteLibrary },
      data: { status: 'ACCEPTED', acceptedAt: new Date(), receiverId: userId },
    });

    // Now clear the cookies since membership is created
    const res = NextResponse.json({
      success: true,
      collectionId: inviteLibrary,
    });
    res.cookies.set('invite_token', '', { path: '/', maxAge: 0 });
    res.cookies.set('invite_library', '', { path: '/', maxAge: 0 });

    console.log('[invite/complete-join] membership created successfully');
    return res;
  } catch (e) {
    console.error('[invite/complete-join] error', e);
    return NextResponse.json(
      { success: false, error: 'Failed to complete join' },
      { status: 500 }
    );
  }
}

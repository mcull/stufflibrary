import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ redirect: null }, { status: 200 });
    }

    const inviteToken = request.cookies.get('invite_token')?.value;
    const inviteLibrary = request.cookies.get('invite_library')?.value;

    if (!inviteToken || !inviteLibrary) {
      return NextResponse.json({ redirect: null }, { status: 200 });
    }

    const libId = inviteLibrary;
    const userId = (session.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ redirect: null }, { status: 200 });
    }

    // Validate invite is still valid for this library
    const invitation = await db.invitation.findFirst({
      where: {
        token: inviteToken,
        libraryId: libId,
        type: 'library',
        status: { in: ['PENDING', 'SENT'] },
      },
      select: { id: true, expiresAt: true },
    });

    if (!invitation || new Date() > invitation.expiresAt) {
      const res = NextResponse.json({ redirect: `/collection/${libId}` });
      // Clear cookies regardless to prevent loops
      res.cookies.set('invite_token', '', { path: '/', maxAge: 0 });
      res.cookies.set('invite_library', '', { path: '/', maxAge: 0 });
      return res;
    }

    // Upsert membership
    const existing = await db.collectionMember.findUnique({
      where: { userId_collectionId: { userId, collectionId: libId } },
      select: { id: true, isActive: true },
    });

    if (!existing) {
      await db.collectionMember.create({
        data: { userId, collectionId: libId, role: 'member', isActive: true },
      });
    } else if (!existing.isActive) {
      await db.collectionMember.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
    }

    // Mark invite accepted
    await db.invitation.updateMany({
      where: { token: inviteToken, libraryId: libId },
      data: { status: 'ACCEPTED', acceptedAt: new Date(), receiverId: userId },
    });

    const res = NextResponse.json({ redirect: `/collection/${libId}` });
    // Clear cookies after consumption
    res.cookies.set('invite_token', '', { path: '/', maxAge: 0 });
    res.cookies.set('invite_library', '', { path: '/', maxAge: 0 });
    return res;
  } catch {
    return NextResponse.json({ redirect: null }, { status: 200 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// Shareable join link with guest preview
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  try {
    if (!token || typeof token !== 'string') {
      return NextResponse.redirect(new URL('/?invite=invalid', request.url));
    }

    const invitation = await db.invitation.findFirst({
      where: {
        token,
        type: 'library',
        status: { in: ['PENDING', 'SENT'] },
      },
      select: {
        libraryId: true,
        expiresAt: true,
      },
    });

    if (!invitation) {
      return NextResponse.redirect(new URL('/?invite=invalid', request.url));
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.redirect(new URL('/?invite=expired', request.url));
    }

    // If session exists, auto-join and accept invite
    const session = await getServerSession(authOptions);
    if (session?.user) {
      const userId = (session.user as { id?: string } | undefined)?.id;
      if (userId) {
        const libId = invitation.libraryId!;
        const existing = await db.collectionMember.findUnique({
          where: { userId_collectionId: { userId, collectionId: libId } },
          select: { id: true, isActive: true },
        });
        if (!existing) {
          await db.collectionMember.create({
            data: {
              userId,
              collectionId: libId,
              role: 'member',
              isActive: true,
            },
          });
        } else if (!existing.isActive) {
          await db.collectionMember.update({
            where: { id: existing.id },
            data: { isActive: true },
          });
        }
        await db.invitation.updateMany({
          where: { token, libraryId: libId },
          data: {
            status: 'ACCEPTED',
            acceptedAt: new Date(),
            receiverId: userId,
          },
        });
        const redirect = new URL(
          `/collection/${libId}?message=joined_successfully`,
          request.url
        );
        const response = NextResponse.redirect(redirect);
        response.cookies.set('invite_token', '', { path: '/', maxAge: 0 });
        response.cookies.set('invite_library', '', { path: '/', maxAge: 0 });
        return response;
      }
    }

    // Not logged in: set guest cookies and redirect
    const target = new URL(
      `/collection/${invitation.libraryId}?guest=1`,
      request.url
    );
    const res = NextResponse.redirect(target);
    res.cookies.set('invite_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    res.cookies.set('invite_library', invitation.libraryId!, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch {
    return NextResponse.redirect(new URL('/?invite=error', request.url));
  }
}

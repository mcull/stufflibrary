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
    console.log('[j/:token] start', {
      url: request.url,
      token: token?.slice(0, 8) + '…',
      hasCookieInviteToken: !!request.cookies.get('invite_token')?.value,
      hasCookieInviteLibrary: !!request.cookies.get('invite_library')?.value,
    });
    if (!token || typeof token !== 'string') {
      console.log('[j/:token] invalid token');
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
      console.log('[j/:token] invitation not found');
      return NextResponse.redirect(new URL('/?invite=invalid', request.url));
    }

    if (new Date() > invitation.expiresAt) {
      console.log('[j/:token] invitation expired', {
        libraryId: invitation.libraryId,
      });
      return NextResponse.redirect(new URL('/?invite=expired', request.url));
    }

    // If session exists, auto-join and accept invite
    const session = await getServerSession(authOptions);
    console.log('[j/:token] session check', {
      hasSessionUser: !!session?.user,
    });
    if (session?.user) {
      const userId = (session.user as { id?: string } | undefined)?.id;
      if (userId) {
        const libId = invitation.libraryId!;
        console.log('[j/:token] authenticated; ensure membership', {
          userId,
          libId,
        });
        const existing = await db.collectionMember.findUnique({
          where: { userId_collectionId: { userId, collectionId: libId } },
          select: { id: true, isActive: true },
        });
        if (!existing) {
          console.log('[j/:token] creating membership');
          await db.collectionMember.create({
            data: {
              userId,
              collectionId: libId,
              role: 'member',
              isActive: true,
            },
          });
        } else if (!existing.isActive) {
          console.log('[j/:token] reactivating membership', {
            id: existing.id,
          });
          await db.collectionMember.update({
            where: { id: existing.id },
            data: { isActive: true },
          });
        }
        console.log('[j/:token] marking invitation accepted');
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
        console.log('[j/:token] redirecting authenticated user', {
          to: redirect.toString(),
        });
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
    console.log(
      '[j/:token] unauthenticated; setting guest cookies and redirect',
      {
        to: target.toString(),
        inviteLibrary: invitation.libraryId,
      }
    );
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
  } catch (e) {
    console.error('[j/:token] error', e);
    return NextResponse.redirect(new URL('/?invite=error', request.url));
  }
}

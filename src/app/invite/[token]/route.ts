import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';

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

    const target = new URL(
      `/collection/${invitation.libraryId}?guest=1`,
      request.url
    );
    const res = NextResponse.redirect(target);
    // Set short-lived cookies (e.g., 7 days or until user closes browser)
    res.cookies.set('invite_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
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

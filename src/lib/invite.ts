import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from './auth';
import { db } from './db';

const INVITE_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function ensureActiveMembership(
  userId: string,
  collectionId: string
): Promise<{ created: boolean; reactivated: boolean }> {
  const existing = await db.collectionMember.findUnique({
    where: { userId_collectionId: { userId, collectionId } },
    select: { id: true, isActive: true },
  });
  if (!existing) {
    await db.collectionMember.create({
      data: { userId, collectionId, role: 'member', isActive: true },
    });
    return { created: true, reactivated: false };
  }
  if (!existing.isActive) {
    await db.collectionMember.update({
      where: { id: existing.id },
      data: { isActive: true },
    });
    return { created: false, reactivated: true };
  }
  return { created: false, reactivated: false };
}

export async function acceptInvitation(
  token: string,
  collectionId: string,
  userId: string
): Promise<void> {
  await db.invitation.updateMany({
    where: { token, libraryId: collectionId },
    data: { status: 'ACCEPTED', acceptedAt: new Date(), receiverId: userId },
  });
}

export type InviteValidation =
  | { ok: true; invitation: { libraryId: string; expiresAt: Date } }
  | { ok: false; reason: 'invalid' | 'expired' };

export async function validateLibraryInvite(
  token: string
): Promise<InviteValidation> {
  const invitation = await db.invitation.findFirst({
    where: { token, type: 'library', status: { in: ['PENDING', 'SENT'] } },
    select: { libraryId: true, expiresAt: true },
  });
  if (!invitation || !invitation.libraryId)
    return { ok: false, reason: 'invalid' };
  if (new Date() > invitation.expiresAt)
    return { ok: false, reason: 'expired' };
  return {
    ok: true,
    invitation: {
      libraryId: invitation.libraryId,
      expiresAt: invitation.expiresAt,
    },
  };
}

export function setInviteCookies(
  res: NextResponse,
  token: string,
  libraryId: string
): void {
  const opts = {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: INVITE_COOKIE_MAX_AGE,
  };
  res.cookies.set('invite_token', token, opts);
  res.cookies.set('invite_library', libraryId, opts);
}

export function clearInviteCookies(res: NextResponse): void {
  res.cookies.set('invite_token', '', { path: '/', maxAge: 0 });
  res.cookies.set('invite_library', '', { path: '/', maxAge: 0 });
}

export async function handleInviteLanding(
  request: NextRequest,
  token: string
): Promise<NextResponse> {
  try {
    if (!token || typeof token !== 'string') {
      return NextResponse.redirect(new URL('/?invite=invalid', request.url));
    }

    const result = await validateLibraryInvite(token);
    if (!result.ok) {
      return NextResponse.redirect(
        new URL(`/?invite=${result.reason}`, request.url)
      );
    }
    const libId = result.invitation.libraryId;

    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;

    if (userId) {
      await ensureActiveMembership(userId, libId);
      await acceptInvitation(token, libId, userId);
      const res = NextResponse.redirect(
        new URL(`/collection/${libId}?message=joined_successfully`, request.url)
      );
      clearInviteCookies(res);
      return res;
    }

    const res = NextResponse.redirect(
      new URL(`/collection/${libId}?guest=1`, request.url)
    );
    setInviteCookies(res, token, libId);
    return res;
  } catch {
    return NextResponse.redirect(new URL('/?invite=error', request.url));
  }
}

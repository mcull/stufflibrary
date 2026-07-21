import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from './auth';
import { db } from './db';
import { normalizeJoinCode } from './join-code';
import { recordJoinCodeUse, resolveJoinCode } from './join-code-service';

const INVITE_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * `invite_token` carries two unrelated things. A bare value is a personal
 * invitation token — bound to an address, single use, burned on accept. A
 * `jc:`-prefixed value is a JoinCode id — bearer, multi-use, burned never.
 * Every reader must branch on this, so the prefix and its parser live in one
 * place rather than as a `startsWith` scattered across call sites that will
 * drift apart.
 */
export const JOIN_CODE_COOKIE_PREFIX = 'jc:';

/** The JoinCode id inside an invite cookie, or null if it holds a token. */
export function parseJoinCodeCookie(value: string): string | null {
  if (!value.startsWith(JOIN_CODE_COOKIE_PREFIX)) return null;
  const id = value.slice(JOIN_CODE_COOKIE_PREFIX.length);
  return id.length > 0 ? id : null;
}

/**
 * Attribution for a member who arrived on a join code: which piece of paper
 * brought them in, and one more tick on that code's counter.
 *
 * Call only when the join actually added someone. `useCount` is what an owner
 * reads as "how many people did the corkboard bring in", so an existing member
 * re-scanning must not move it, and neither must the owner testing their own
 * flyer.
 */
export async function attributeJoinCode(
  userId: string,
  collectionId: string,
  codeId: string
): Promise<void> {
  await db.collectionMember.updateMany({
    where: { userId, collectionId },
    data: { joinedViaCodeId: codeId },
  });
  await recordJoinCodeUse(codeId);
}

export async function ensureActiveMembership(
  userId: string,
  collectionId: string
): Promise<{ created: boolean; reactivated: boolean; owner: boolean }> {
  // The owner never gets a member row — ownership already anchors them to the
  // library, and a self-row corrupts member counts (#409; the cleanup P0-13
  // deferred). This guards every join path at once.
  const collection = await db.collection.findUnique({
    where: { id: collectionId },
    select: { ownerId: true },
  });
  if (collection?.ownerId === userId) {
    return { created: false, reactivated: false, owner: true };
  }

  const existing = await db.collectionMember.findUnique({
    where: { userId_collectionId: { userId, collectionId } },
    select: { id: true, isActive: true },
  });
  if (!existing) {
    await db.collectionMember.create({
      data: { userId, collectionId, role: 'member', isActive: true },
    });
    return { created: true, reactivated: false, owner: false };
  }
  if (!existing.isActive) {
    await db.collectionMember.update({
      where: { id: existing.id },
      data: { isActive: true },
    });
    return { created: false, reactivated: true, owner: false };
  }
  return { created: false, reactivated: false, owner: false };
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

/**
 * A personal invitation is bound to the address it was sent to. Defaults to
 * false on any missing input — an absent session email must never satisfy the
 * check, or an OAuth account with no address on it walks straight in.
 */
export function emailMatchesInvitation(
  sessionEmail: string | null | undefined,
  invitationEmail: string
): boolean {
  if (!sessionEmail) return false;
  const seen = sessionEmail.trim().toLowerCase();
  if (!seen) return false;
  return seen === invitationEmail.trim().toLowerCase();
}

/** dave@example.com -> d•••@example.com — recognizable, not harvestable. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '•••';
  return `${local[0]}•••@${domain}`;
}

export type InviteValidation =
  | {
      ok: true;
      invitation: { libraryId: string; expiresAt: Date; email: string };
    }
  | { ok: false; reason: 'invalid' | 'expired' };

export async function validateLibraryInvite(
  token: string
): Promise<InviteValidation> {
  const invitation = await db.invitation.findFirst({
    where: { token, type: 'library', status: { in: ['PENDING', 'SENT'] } },
    select: { libraryId: true, expiresAt: true, email: true },
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
      email: invitation.email,
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
    const sessionUser = session?.user as
      | { id?: string; email?: string }
      | undefined;
    const userId = sessionUser?.id;

    if (userId) {
      // This branch bypasses sign-in by design, so it never sees the address
      // the sign-in page locks to the invitation. It is one of the two ways a
      // forwarded link reaches a live session, so the binding check has to
      // happen here as well as in /api/invite/consume.
      //
      // Deliberately before ensureActiveMembership: a mismatch must grant
      // nothing and burn nothing. Checking after would leave the stranger
      // rejected but Dave's invitation destroyed. The owner previewing their
      // own link under a different address lands here too and sees the
      // "sent to d•••@" dead end rather than "your own library" — a worse
      // message, but the check stays a single unconditional comparison
      // instead of a security guard with an exemption in it.
      if (
        !emailMatchesInvitation(sessionUser?.email, result.invitation.email)
      ) {
        // The address stays out of the URL entirely — masked or not, a query
        // parameter lands in browser history and outbound Referer. The dead
        // end reads it back off the cookie instead, which is also what
        // consume needs still sitting there to finish the job once the right
        // person arrives.
        const res = NextResponse.redirect(
          new URL('/?invite=wrong_account', request.url)
        );
        setInviteCookies(res, token, libId);
        return res;
      }

      const membership = await ensureActiveMembership(userId, libId);

      // Consume the invitation ONLY when this click actually added someone.
      // The owner previewing their own sent link, or an existing member
      // re-clicking, must not burn the invite for its real addressee (#409).
      if (membership.owner) {
        const res = NextResponse.redirect(
          new URL(`/library/${libId}?message=own_library`, request.url)
        );
        clearInviteCookies(res);
        return res;
      }
      if (membership.created || membership.reactivated) {
        await acceptInvitation(token, libId, userId);
        const res = NextResponse.redirect(
          new URL(`/library/${libId}?message=joined_successfully`, request.url)
        );
        clearInviteCookies(res);
        return res;
      }
      const res = NextResponse.redirect(
        new URL(`/library/${libId}?message=already_member`, request.url)
      );
      clearInviteCookies(res);
      return res;
    }

    // No guest preview for a personal invite. Dave asked to join this library
    // by name; a browse-first detour answers a question he did not ask. He
    // goes to sign-in, where /api/invite/context reads the cookie set here and
    // locks the field to the invited address. Join codes keep the preview —
    // see handleJoinCodeLanding.
    const res = NextResponse.redirect(new URL('/auth/signin', request.url));
    setInviteCookies(res, token, libId);
    return res;
  } catch {
    return NextResponse.redirect(new URL('/?invite=error', request.url));
  }
}

/**
 * Join codes keep the guest preview; personal invites do not.
 *
 * A stranger who scanned a corkboard QR asked no question — they need to see
 * the shelf before deciding whether to bother making an account. Dave, invited
 * by name to a specific library, asked a direct one and gets a direct answer.
 * See `handleInviteLanding`, which sends him straight to sign-in.
 *
 * There is no binding check here and there cannot be one: a join code is
 * addressed to nobody, so there is no address to compare a session against.
 * Bearer is the whole design, not an omission.
 *
 * Returns null when no active code matches, so the caller can go on to try
 * `Invitation.shortCode` and, failing that, count the miss. A thrown error is
 * NOT a miss — it comes back as a response, because an outage is not a guess
 * and must not spend anyone's rate-limit budget.
 */
export async function handleJoinCodeLanding(
  request: NextRequest,
  rawCode: string
): Promise<NextResponse | null> {
  try {
    const resolved = await resolveJoinCode(normalizeJoinCode(rawCode));
    if (!resolved) return null;

    const libId = resolved.collectionId;
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;

    if (!userId) {
      const res = NextResponse.redirect(
        new URL(`/library/${libId}?guest=1`, request.url)
      );
      setInviteCookies(res, `${JOIN_CODE_COOKIE_PREFIX}${resolved.id}`, libId);
      return res;
    }

    const membership = await ensureActiveMembership(userId, libId);

    let message = 'already_member';
    if (membership.owner) {
      message = 'own_library';
    } else if (membership.created || membership.reactivated) {
      message = 'joined_successfully';
      await attributeJoinCode(userId, libId, resolved.id);
    }

    const res = NextResponse.redirect(
      new URL(`/library/${libId}?message=${message}`, request.url)
    );
    clearInviteCookies(res);
    return res;
  } catch {
    return NextResponse.redirect(new URL('/?invite=error', request.url));
  }
}

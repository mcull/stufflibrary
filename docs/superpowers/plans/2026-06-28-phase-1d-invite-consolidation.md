# Phase 1D — Invite Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the duplicated invite/join logic into one tested `src/lib/invite.ts`, dedupe the two identical landing routes behind a shared handler, refactor the live consumers to use the module, and delete the two dead routes — behavior-preserving.

**Architecture:** A new `src/lib/invite.ts` owns the four repeated operations (idempotent membership, accept-invitation, validate-token, invite cookies). A shared `handleInviteLanding` backs both `/j/[token]` and `/invite/[token]`. Each live consumer calls the helpers instead of inlining. No external entry-point or behavior changes.

**Tech Stack:** Next.js App Router (route handlers), Prisma + Postgres, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-28-phase-1d-invite-consolidation-design.md`

---

## File structure

| File                                              | Responsibility                                                                     |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/lib/invite.ts`                               | shared module: membership/accept/validate/cookies + `handleInviteLanding` (create) |
| `src/lib/__tests__/invite.test.ts`                | unit tests for the module (create)                                                 |
| `src/app/j/[token]/route.ts`                      | thin wrapper → `handleInviteLanding` (modify)                                      |
| `src/app/invite/[token]/route.ts`                 | thin wrapper → `handleInviteLanding` (modify)                                      |
| `src/app/api/invite/consume/route.ts`             | use helpers (modify)                                                               |
| `src/app/api/collections/[id]/join/route.ts`      | use helpers in POST (modify)                                                       |
| `src/app/api/auth/magic-link/route.ts`            | use helpers (modify)                                                               |
| `src/app/api/invitations/[token]/accept/route.ts` | use helpers (modify)                                                               |
| `src/app/api/invite/complete-join/route.ts`       | DELETE (dead)                                                                      |
| `src/app/api/libraries/[id]/join/route.ts`        | DELETE (dead alias)                                                                |

Work on branch `phase1d/invite-consolidation`. No schema/migration. This is a refactor: **read each route fully before editing**, and preserve its exact responses/redirects/cookies/guards.

---

## Task 1: Shared module — membership, accept, validate, cookies

**Files:** Create `src/lib/invite.ts`; create `src/lib/__tests__/invite.test.ts`.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockMemberFindUnique = vi.hoisted(() => vi.fn());
const mockMemberCreate = vi.hoisted(() => vi.fn());
const mockMemberUpdate = vi.hoisted(() => vi.fn());
const mockInvitationUpdateMany = vi.hoisted(() => vi.fn());
const mockInvitationFindFirst = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  db: {
    collectionMember: {
      findUnique: mockMemberFindUnique,
      create: mockMemberCreate,
      update: mockMemberUpdate,
    },
    invitation: {
      updateMany: mockInvitationUpdateMany,
      findFirst: mockInvitationFindFirst,
    },
  },
}));

import {
  ensureActiveMembership,
  acceptInvitation,
  validateLibraryInvite,
} from '../invite';

beforeEach(() => {
  vi.clearAllMocks();
  mockMemberCreate.mockResolvedValue({});
  mockMemberUpdate.mockResolvedValue({});
  mockInvitationUpdateMany.mockResolvedValue({ count: 1 });
});

describe('ensureActiveMembership', () => {
  it('creates a membership when none exists', async () => {
    mockMemberFindUnique.mockResolvedValueOnce(null);
    const r = await ensureActiveMembership('u1', 'c1');
    expect(mockMemberCreate).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        collectionId: 'c1',
        role: 'member',
        isActive: true,
      },
    });
    expect(r).toEqual({ created: true, reactivated: false });
  });
  it('reactivates an inactive membership', async () => {
    mockMemberFindUnique.mockResolvedValueOnce({ id: 'm1', isActive: false });
    const r = await ensureActiveMembership('u1', 'c1');
    expect(mockMemberUpdate).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: { isActive: true },
    });
    expect(r).toEqual({ created: false, reactivated: true });
  });
  it('is a no-op when already active', async () => {
    mockMemberFindUnique.mockResolvedValueOnce({ id: 'm1', isActive: true });
    const r = await ensureActiveMembership('u1', 'c1');
    expect(mockMemberCreate).not.toHaveBeenCalled();
    expect(mockMemberUpdate).not.toHaveBeenCalled();
    expect(r).toEqual({ created: false, reactivated: false });
  });
});

describe('acceptInvitation', () => {
  it('marks the invitation accepted by the user', async () => {
    await acceptInvitation('tok', 'c1', 'u1');
    expect(mockInvitationUpdateMany).toHaveBeenCalledWith({
      where: { token: 'tok', libraryId: 'c1' },
      data: {
        status: 'ACCEPTED',
        acceptedAt: expect.any(Date),
        receiverId: 'u1',
      },
    });
  });
});

describe('validateLibraryInvite', () => {
  it('returns ok with the invitation when valid', async () => {
    const future = new Date(Date.now() + 86400000);
    mockInvitationFindFirst.mockResolvedValueOnce({
      libraryId: 'c1',
      expiresAt: future,
    });
    const r = await validateLibraryInvite('tok');
    expect(r).toEqual({
      ok: true,
      invitation: { libraryId: 'c1', expiresAt: future },
    });
  });
  it('returns invalid when not found', async () => {
    mockInvitationFindFirst.mockResolvedValueOnce(null);
    expect(await validateLibraryInvite('tok')).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });
  it('returns expired when past expiry', async () => {
    const past = new Date(Date.now() - 1000);
    mockInvitationFindFirst.mockResolvedValueOnce({
      libraryId: 'c1',
      expiresAt: past,
    });
    expect(await validateLibraryInvite('tok')).toEqual({
      ok: false,
      reason: 'expired',
    });
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/lib/__tests__/invite.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `src/lib/invite.ts`** (helpers only; handler added in Task 2)

```ts
import { NextResponse } from 'next/server';

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
```

- [ ] **Step 4: Run to confirm pass**

Run: `npx vitest run src/lib/__tests__/invite.test.ts && npx tsc --noEmit`
Expected: PASS / clean. (If `validateLibraryInvite`'s `findFirst` select shape needs `libraryId` non-null typing, the `!invitation.libraryId` guard handles it.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/invite.ts src/lib/__tests__/invite.test.ts
git commit -m "feat(invite): shared membership/accept/validate/cookie helpers (Phase 1D)"
```

---

## Task 2: Shared landing handler + dedupe j/ and invite/

**Files:** Modify `src/lib/invite.ts` (add `handleInviteLanding`); modify `src/app/j/[token]/route.ts` and `src/app/invite/[token]/route.ts`.

- [ ] **Step 1: Read the current landing route**

Read `src/app/j/[token]/route.ts` fully. It is the source of truth for landing behavior: validate token; if `session.user.id` present → ensure membership + accept invite + redirect to `/collection/{libId}?message=joined_successfully` (clearing invite cookies); else set guest cookies and redirect to `/collection/{libId}?guest=1`; invalid/expired/error → redirect to `/?invite=invalid|expired|error`. Note the exact redirect query strings so the handler reproduces them.

- [ ] **Step 2: Add `handleInviteLanding` to `src/lib/invite.ts`**

Append (imports: add `NextRequest` and `getServerSession`/`authOptions`):

```ts
import { type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

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
```

Verify against the route you read: redirect targets/query strings, the authenticated-vs-guest split, and cookie behavior must match exactly. Adjust if the original differs (e.g. a different success query param).

- [ ] **Step 3: Make both routes thin wrappers**

`src/app/j/[token]/route.ts`:

```ts
import { type NextRequest } from 'next/server';

import { handleInviteLanding } from '@/lib/invite';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  return handleInviteLanding(request, token);
}
```

`src/app/invite/[token]/route.ts`: identical body. (Both URLs keep working; all duplicated logic and debug `console.log`s are gone.)

- [ ] **Step 4: Add a handler smoke test**

Add to `src/lib/__tests__/invite.test.ts` (extend the existing `@/lib/db` mock with `user`/session as needed, and mock `next-auth`):

```ts
const mockGetServerSession = vi.hoisted(() => vi.fn());
vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
// ...
import { handleInviteLanding } from '../invite';

describe('handleInviteLanding', () => {
  it('authenticated user joins and is redirected to the collection', async () => {
    mockInvitationFindFirst.mockResolvedValue({
      libraryId: 'c1',
      expiresAt: new Date(Date.now() + 86400000),
    });
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } });
    mockMemberFindUnique.mockResolvedValue(null);
    const res = await handleInviteLanding(
      { url: 'https://x/j/tok' } as any,
      'tok'
    );
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain(
      '/collection/c1?message=joined_successfully'
    );
    expect(mockMemberCreate).toHaveBeenCalled();
  });
  it('invalid token redirects home with invite=invalid', async () => {
    mockInvitationFindFirst.mockResolvedValue(null);
    const res = await handleInviteLanding(
      { url: 'https://x/j/tok' } as any,
      'tok'
    );
    expect(res.headers.get('location')).toContain('/?invite=invalid');
  });
});
```

- [ ] **Step 5: Run + verify**

Run: `npx vitest run src/lib/__tests__/invite.test.ts && npx tsc --noEmit && npm run lint`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/invite.ts src/app/j/[token]/route.ts src/app/invite/[token]/route.ts src/lib/__tests__/invite.test.ts
git commit -m "refactor(invite): shared landing handler for /j and /invite (Phase 1D)"
```

---

## Task 3: Refactor `invite/consume`

**Files:** Modify `src/app/api/invite/consume/route.ts`.

- [ ] **Step 1: Read the route** fully. It reads `invite_token`/`invite_library` cookies, validates, ensures membership, accepts the invite, clears cookies, returns a redirect URL JSON.

- [ ] **Step 2: Replace the inlined blocks** with helper calls: use `validateLibraryInvite(inviteToken)` for lookup/expiry, `ensureActiveMembership(userId, libId)` for the membership upsert, `acceptInvitation(inviteToken, libId, userId)` for the accept, and `clearInviteCookies(res)` on the response. Preserve the exact response shape (the JSON/redirect it currently returns) and the auth guard. Import from `@/lib/invite`.

- [ ] **Step 3: Verify behavior unchanged**

Run: `npx tsc --noEmit && npm run lint`
If a test exists for this route, run it; otherwise add a small smoke test asserting a cookie-driven join calls membership creation and returns the success redirect (follow existing route-test patterns).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/invite/consume
git commit -m "refactor(invite): consume uses shared helpers (Phase 1D)"
```

---

## Task 4: Refactor `collections/[id]/join` (POST)

**Files:** Modify `src/app/api/collections/[id]/join/route.ts`.

- [ ] **Step 1: Read the route** fully. POST handles public-collection join OR invite-gated join; it has a `findUnique` membership check with an "already a member" 400 for active members, reactivation for inactive, and create otherwise, then marks the invite accepted and clears cookies. DELETE (leave) is separate.

- [ ] **Step 2: Refactor the shared parts only.** Keep the public-vs-private gating and the existing "already an active member → 400" response (do NOT change that contract). Where it currently does the find/create/reactivate, you may either keep the explicit branch (it already returns the 400 on active) or use `ensureActiveMembership` and derive the 400 from its `{ created, reactivated }` result (if neither created nor reactivated → already active → return the same 400). Use `acceptInvitation(...)` for the invite-accept block and `clearInviteCookies(res)` for cookies. Preserve all responses and the DELETE handler exactly.

- [ ] **Step 3: Verify** — `npx tsc --noEmit && npm run lint`; run any existing join-route test (the P0-13 duplicate-guard test must stay green). Add a smoke test if none exists.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/collections/[id]/join
git commit -m "refactor(invite): collections join uses shared helpers (Phase 1D)"
```

---

## Task 5: Refactor `auth/magic-link`

**Files:** Modify `src/app/api/auth/magic-link/route.ts`.

- [ ] **Step 1: Read the route** fully. It validates an email invite token, upserts the user, creates membership, marks the invite accepted, generates an auth code, and redirects to `/auth/signin?...`. There is a test: `src/lib/__tests__/magic-link-api.spec.ts`.

- [ ] **Step 2: Replace the membership-create + invite-accept blocks** with `ensureActiveMembership(user.id, libId)` and `acceptInvitation(token, libId, user.id)`. Leave the user upsert, auth-code generation, and redirect untouched. (Note: this route uses its own invite lookup tied to the email token; only swap the membership/accept steps — keep its token validation as-is unless it cleanly maps to `validateLibraryInvite`.)

- [ ] **Step 3: Verify** — `npx vitest run src/lib/__tests__/magic-link-api.spec.ts && npx tsc --noEmit && npm run lint`. The existing magic-link spec must stay green (it's the behavior contract).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/magic-link
git commit -m "refactor(invite): magic-link uses shared membership helpers (Phase 1D)"
```

---

## Task 6: Refactor `invitations/[token]/accept`

**Files:** Modify `src/app/api/invitations/[token]/accept/route.ts`.

- [ ] **Step 1: Read the route** fully. POST validates the invite, enforces an email-match guard (the invite must be for the caller's account), then ensures membership + marks accepted, returning a JSON body describing the joined library.

- [ ] **Step 2: Replace the membership + accept blocks** with `ensureActiveMembership(userId, libId)` and `acceptInvitation(token, libId, userId)`. Keep the email-match guard, the "already a member" response, and the exact JSON response shape. (Its lookup includes the collection for the response; keep that `include`/`findFirst` as-is, or use `validateLibraryInvite` only if the collection data is still fetched for the response.)

- [ ] **Step 3: Verify** — `npx tsc --noEmit && npm run lint`; run any existing test for this route; add a smoke test if none.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/invitations/[token]/accept
git commit -m "refactor(invite): accept route uses shared helpers (Phase 1D)"
```

---

## Task 7: Delete the dead routes

**Files:** Delete `src/app/api/invite/complete-join/route.ts` and `src/app/api/libraries/[id]/join/route.ts`.

- [ ] **Step 1: Re-verify no references**

Run:

```
grep -rnoE "/api/invite/complete-join|complete-join" src --include="*.ts" --include="*.tsx" | grep -v "app/api/invite/complete-join"
grep -rnoE "/api/libraries/[^/\"' ]+/join|libraries/\\\$\{[^}]+\}/join" src --include="*.ts" --include="*.tsx" | grep -v "app/api/libraries"
```

Expected: no output for each. If either has a reference, do NOT delete it — instead point it at the shared helpers and note it.

- [ ] **Step 2: Delete**

```bash
git rm src/app/api/invite/complete-join/route.ts
git rm src/app/api/libraries/[id]/join/route.ts
```

- [ ] **Step 3: Verify nothing broke**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean (no import errors referencing the deleted files).

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(invite): remove dead complete-join and libraries/join alias (Phase 1D)"
```

---

## Task 8: Full verification + PR

- [ ] **Step 1: Full suite** — `npx vitest run` → all green except the 2 known pre-existing `WatercolorService` failures (the P0-13 duplicate-membership and members-display tests must still pass).
- [ ] **Step 2: Typecheck + lint** — `npx tsc --noEmit && npm run lint` → clean, 0 lint errors.
- [ ] **Step 3: Build** — `SKIP_ENV_VALIDATION=1 npx next build` → compiles; `/j/[token]`, `/invite/[token]`, the join/consume/magic-link/accept routes still present; complete-join and libraries/join gone.
- [ ] **Step 4: Push + PR**

```bash
git push -u origin phase1d/invite-consolidation
gh pr create --base main --title "Phase 1D: Invite consolidation (#365)" --body "Implements docs/superpowers/specs/2026-06-28-phase-1d-invite-consolidation-design.md. Closes #365."
```

- [ ] **Step 5: Verify on the preview deploy** — confirm the build is green and (manually, optional) that an invite link still lands + joins, since this is behavior-preserving.

---

## Notes for the implementer

- This is a **behavior-preserving refactor**: every refactored route must return the same responses, redirects, cookies, and guards it did before. Read each route fully before editing; when in doubt, keep the route's exact response shape and only swap the membership/accept/validate/cookie internals for the shared helpers.
- `ensureActiveMembership` is the single source of truth for the P0-13 duplicate guard — don't reintroduce inline create-without-check anywhere.
- Don't change invite-creation, the guest-preview UX, or any external URL.
- If a route's invite-token lookup is meaningfully different from `validateLibraryInvite` (e.g. magic-link's email-token, or accept's collection-include for the response), leave that lookup as-is and only share the membership/accept/cookie steps.

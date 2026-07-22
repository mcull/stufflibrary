# Invite Flow Ship-This-Week Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the four bug-tier fixes from the invite redesign dossier so a personal invitation can no longer be silently abandoned mid-flow.

**Architecture:** Four independent fixes on one branch (`fix/invite-flow-ship-this-week`, already created off `origin/main`, spec committed). A tiny new pure module `src/lib/post-auth.ts` centralizes post-auth destination validation; everything else is edits to existing routes/pages. Spec: `docs/superpowers/specs/2026-07-22-invite-flow-ship-this-week-design.md`.

**Tech Stack:** Next.js App Router, NextAuth, Prisma, Vitest (`npm run test:unit` / `npx vitest run <file>`). Tests mock `@/lib/db` and `next-auth` with `vi.hoisted` mocks — copy the pattern from `src/lib/__tests__/invite.test.ts`.

**Known context:** The repo has some pre-existing test failures unrelated to this work — record the baseline in Task 1 and compare against it, don't chase them. Husky prints a deprecation warning on commit; ignore it. Commit messages get a one-line `Why:` trailer (field-notes convention) plus the `Co-Authored-By:` line.

---

### Task 1: Record the test baseline

**Files:** none modified.

- [ ] **Step 1: Confirm you are on the right branch**

Run: `git branch --show-current`
Expected: `fix/invite-flow-ship-this-week`

- [ ] **Step 2: Run the unit suite and save the baseline**

Run: `npm run test:unit 2>&1 | tail -30`

Record which files/tests fail (if any) — these are pre-existing failures. The final verification (Task 7) must show _no new_ failures relative to this list.

---

### Task 2: Fix 2 — pending invites filter on `type: 'library'` (§6.8)

**Files:**

- Test (create): `src/app/api/invitations/pending/__tests__/route.test.ts`
- Modify: `src/app/api/invitations/pending/route.ts:31`

**Bug:** the route filters `type: 'collection'` but every invitation row is written with `type: 'library'`, so the in-app pending-invites panel is permanently empty.

- [ ] **Step 1: Write the failing test**

Create `src/app/api/invitations/pending/__tests__/route.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockInvitationFindMany = vi.hoisted(() => vi.fn());
const mockMemberFindMany = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: mockUserFindUnique },
    invitation: { findMany: mockInvitationFindMany },
    collectionMember: { findMany: mockMemberFindMany },
  },
}));

import { GET } from '../route';

const INVITATION = {
  id: 'inv_1',
  token: 'tok_abc',
  createdAt: new Date('2026-07-20'),
  expiresAt: new Date('2026-07-27'),
  collection: {
    id: 'lib_1',
    name: 'HAASS',
    location: 'Berkeley Hills',
    owner: { name: 'Marc', email: 'marc@example.com' },
    _count: { members: 3 },
  },
  sender: { name: 'Marc', email: 'marc@example.com' },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } });
  mockUserFindUnique.mockResolvedValue({ email: 'nora@example.com' });
  mockInvitationFindMany.mockResolvedValue([INVITATION]);
  mockMemberFindMany.mockResolvedValue([]);
});

describe('GET /api/invitations/pending', () => {
  it("filters on type 'library' — the type invitations are actually written with (§6.8)", async () => {
    await GET({} as never);

    expect(mockInvitationFindMany).toHaveBeenCalledTimes(1);
    const where = mockInvitationFindMany.mock.calls[0]![0].where;
    expect(where.type).toBe('library');
    expect(where.email).toBe('nora@example.com');
  });

  it('returns the pending invitation for the session email', async () => {
    const res = await GET({} as never);
    const body = await res.json();

    expect(body.invitations).toHaveLength(1);
    expect(body.invitations[0].collection.name).toBe('HAASS');
    expect(body.invitations[0].token).toBe('tok_abc');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run "src/app/api/invitations/pending/__tests__/route.test.ts"`
Expected: FAIL — `where.type` is `'collection'`, not `'library'`.

- [ ] **Step 3: Fix the filter**

In `src/app/api/invitations/pending/route.ts:31`, change:

```ts
        type: 'collection',
```

to:

```ts
        // 'library' is what every invitation is written with; 'collection'
        // matched nothing, leaving the in-app pending panel permanently empty
        // (InviteFlows §6.8).
        type: 'library',
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run "src/app/api/invitations/pending/__tests__/route.test.ts"`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/invitations/pending/route.ts" "src/app/api/invitations/pending/__tests__/route.test.ts"
git commit -m "fix(invites): pending-invites filter matches the type invitations are written with

The route filtered type:'collection'; every row is type:'library'. The
in-app \"you've been invited\" panel has been permanently empty since the
rename (InviteFlows §6.8).

Why: existing users could not discover pending invites in-app; the email was the only door

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Fix 3 — signed-out bound invitees get the guest preview (§6.1)

**Files:**

- Modify: `src/lib/__tests__/invite.test.ts:223-238` (the `unauthenticated user gets invite cookies and is sent to sign-in` test)
- Modify: `src/lib/__tests__/invite-binding.test.ts:269-278` (the `sends the unauthenticated invitee to sign-in, not the guest preview` test)
- Modify: `src/lib/invite.ts:243-250` (signed-out branch of `handleInviteLanding`)

**Bug (design, reversed deliberately):** a signed-out personal invitee hits `/auth/signin` while a flyer stranger gets a full guest preview. The dossier's evidence: six real invites, zero joins, against the sign-in wall.

- [ ] **Step 1: Invert the test in `invite.test.ts`**

Replace the test at `src/lib/__tests__/invite.test.ts:223-238` with:

```ts
it('unauthenticated invitee gets invite cookies and the guest preview (front porch)', async () => {
  mockInvitationFindFirst.mockResolvedValue({
    libraryId: 'c1',
    expiresAt: new Date(Date.now() + 86400000),
    email: 'dave@example.com',
  });
  mockGetServerSession.mockResolvedValue(null);
  const res = await handleInviteLanding(
    { url: 'https://x/j/tok' } as any,
    'tok'
  );
  expect(res.status).toBe(307);
  expect(res.headers.get('location')).toContain('/library/c1?guest=1');
  expect(res.cookies.get('invite_token')?.value).toBe('tok');
  expect(res.cookies.get('invite_library')?.value).toBe('c1');
});
```

- [ ] **Step 2: Invert the test in `invite-binding.test.ts`**

Replace the test at `src/lib/__tests__/invite-binding.test.ts:269-278` with (keep using the file's existing `inviteRow()`/`landing()` helpers):

```ts
it('sends the unauthenticated invitee to the guest preview, not a sign-in wall', async () => {
  mockInvitationFindFirst.mockResolvedValue(inviteRow());
  mockGetServerSession.mockResolvedValue(null);

  const res = await landing();
  const location = res.headers.get('location') ?? '';

  expect(location).toContain('guest=1');
  expect(location).not.toContain('/auth/signin');
});
```

Note: the neighboring test `carries the invitation in cookies and never the address in the URL` (`invite-binding.test.ts:282`) must keep passing unchanged — the cookies and the no-address-in-URL guarantee survive this fix.

- [ ] **Step 3: Run both files to verify the new tests fail**

Run: `npx vitest run src/lib/__tests__/invite.test.ts src/lib/__tests__/invite-binding.test.ts`
Expected: exactly the two inverted tests FAIL (location is `/auth/signin`); everything else passes.

- [ ] **Step 4: Change the signed-out branch**

In `src/lib/invite.ts`, replace lines 243-250:

```ts
// No guest preview for a personal invite. Dave asked to join this library
// by name; a browse-first detour answers a question he did not ask. He
// goes to sign-in, where /api/invite/context reads the cookie set here and
// locks the field to the invited address. Join codes keep the preview —
// see handleJoinCodeLanding.
const res = NextResponse.redirect(new URL('/auth/signin', request.url));
setInviteCookies(res, token, libId);
return res;
```

with:

```ts
// The front porch: a signed-out invitee sees the guest preview, exactly
// like a join-code holder. This reverses the earlier sign-in-first
// decision — the first real batch of six personal invites produced zero
// joins against that wall. The preview grants nothing and burns nothing;
// the email-binding check still runs on the signed-in branch above and in
// /api/invite/consume. The cookie set here is what later locks sign-in to
// the invited address when the invitee claims their card.
const res = NextResponse.redirect(
  new URL(`/library/${libId}?guest=1`, request.url)
);
setInviteCookies(res, token, libId);
return res;
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/invite.test.ts src/lib/__tests__/invite-binding.test.ts`
Expected: PASS, all tests in both files.

- [ ] **Step 6: Commit**

```bash
git add src/lib/invite.ts src/lib/__tests__/invite.test.ts src/lib/__tests__/invite-binding.test.ts
git commit -m "fix(invites): signed-out personal invitees land on the guest preview

A flyer stranger got the full shelf preview; the personally-vouched-for
neighbor got a sign-in wall (InviteFlows §6.1). The preview grants
nothing and burns nothing — all binding checks stay server-side at
consume and at signed-in landing.

Why: six real personal invites produced zero joins; the dossier's audit put the login wall first among the causes

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Fix 1 (part 1) — post-auth destination helper

**Files:**

- Create: `src/lib/post-auth.ts`
- Test (create): `src/lib/__tests__/post-auth.test.ts`

The validation logic lives in one pure module so the sign-in page (builds the URL) and the callback page (honors `next`) cannot drift apart.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/post-auth.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

import { buildPostAuthCallbackUrl, safeRelativePath } from '../post-auth';

describe('safeRelativePath', () => {
  it('accepts a same-origin relative path', () => {
    expect(safeRelativePath('/feedback')).toBe('/feedback');
    expect(safeRelativePath('/library/abc?guest=1')).toBe(
      '/library/abc?guest=1'
    );
  });
  it('rejects absolute URLs', () => {
    expect(safeRelativePath('https://evil.example/x')).toBeNull();
  });
  it('rejects protocol-relative URLs', () => {
    expect(safeRelativePath('//evil.example/x')).toBeNull();
  });
  it('rejects empty and missing values', () => {
    expect(safeRelativePath('')).toBeNull();
    expect(safeRelativePath(null)).toBeNull();
    expect(safeRelativePath(undefined)).toBeNull();
  });
});

describe('buildPostAuthCallbackUrl', () => {
  it('routes through /auth/callback with no extras by default', () => {
    expect(buildPostAuthCallbackUrl({})).toBe('/auth/callback');
  });
  it('demotes a requested callbackUrl to a next= fallback — never a replacement', () => {
    expect(buildPostAuthCallbackUrl({ requested: '/feedback' })).toBe(
      '/auth/callback?next=%2Ffeedback'
    );
  });
  it('drops an unsafe requested destination', () => {
    expect(
      buildPostAuthCallbackUrl({ requested: 'https://evil.example' })
    ).toBe('/auth/callback');
    expect(buildPostAuthCallbackUrl({ requested: '//evil.example' })).toBe(
      '/auth/callback'
    );
  });
  it('does not point the callback at itself', () => {
    expect(buildPostAuthCallbackUrl({ requested: '/auth/callback' })).toBe(
      '/auth/callback'
    );
  });
  it('carries the legacy invitation params', () => {
    expect(
      buildPostAuthCallbackUrl({ invitationToken: 'tok', libraryId: 'lib' })
    ).toBe('/auth/callback?invitation=tok&library=lib');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/post-auth.test.ts`
Expected: FAIL — module `../post-auth` does not exist.

- [ ] **Step 3: Write the module**

Create `src/lib/post-auth.ts`:

```ts
/**
 * Post-auth routing has exactly one mandatory stop: /auth/callback, where the
 * invite cookie is consumed. A `?callbackUrl=` planted by a login-walled page
 * (e.g. /feedback) used to *replace* that stop, silently discarding a pending
 * invitation — the observed ending of the first real invite batch. Here the
 * requested destination is demoted to a `next=` fallback the callback honors
 * only after the consume attempt.
 */

/** A destination is safe only if it stays on this origin: a relative path,
 *  not protocol-relative. Anything else becomes null (= no destination). */
export function safeRelativePath(
  raw: string | null | undefined
): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}

/** The one URL sign-in may hand NextAuth as callbackUrl. */
export function buildPostAuthCallbackUrl(opts: {
  requested?: string | null;
  invitationToken?: string | null;
  libraryId?: string | null;
}): string {
  const params = new URLSearchParams();
  if (opts.invitationToken) {
    params.set('invitation', opts.invitationToken);
    if (opts.libraryId) params.set('library', opts.libraryId);
  }
  const requested = safeRelativePath(opts.requested ?? null);
  // The callback pointing at itself would loop; treat it as no request.
  if (requested && !requested.startsWith('/auth/callback')) {
    params.set('next', requested);
  }
  const qs = params.toString();
  return qs ? `/auth/callback?${qs}` : '/auth/callback';
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/post-auth.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/post-auth.ts src/lib/__tests__/post-auth.test.ts
git commit -m "feat(auth): post-auth destination helper — callback always wins, next is a fallback

Why: a stray tap on /feedback mid-invite rewrote callbackUrl and skipped invite consumption entirely; destination validation now lives in one tested module

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Fix 1 (part 2) — wire sign-in and callback pages

**Files:**

- Modify: `src/app/auth/signin/page.tsx:46-58`
- Modify: `src/app/auth/callback/page.tsx` (lines 17-19 and 117-122)

- [ ] **Step 1: Wire the sign-in page**

In `src/app/auth/signin/page.tsx`, add to the imports (after the `@/components` imports, keeping alphabetical-ish grouping):

```ts
import { buildPostAuthCallbackUrl } from '@/lib/post-auth';
```

Then replace lines 46-58:

```ts
// Default to server-side callback that decides destination post-auth
const libraryId = searchParams.get('library');
const callbackUrl =
  searchParams.get('callbackUrl') ||
  (() => {
    if (invitationToken) {
      const params = new URLSearchParams();
      params.set('invitation', invitationToken);
      if (libraryId) params.set('library', libraryId);
      return `/auth/callback?${params.toString()}`;
    }
    return '/auth/callback';
  })();
```

with:

```ts
const libraryId = searchParams.get('library');
// Every sign-in routes through /auth/callback so invite consumption always
// runs first. A ?callbackUrl= from a login-walled page (e.g. /feedback)
// rides along as a next= fallback — it can no longer pre-empt the callback
// and silently discard a pending invitation.
const callbackUrl = buildPostAuthCallbackUrl({
  requested: searchParams.get('callbackUrl'),
  invitationToken,
  libraryId,
});
```

- [ ] **Step 2: Wire the callback page**

In `src/app/auth/callback/page.tsx`, add to the imports:

```ts
import { safeRelativePath } from '@/lib/post-auth';
```

After line 18 (`const libraryId = searchParams.get('library');`) add:

```ts
const nextParam = searchParams.get('next');
```

Replace the final "Normal flow" block (lines 117-122):

```ts
// Normal flow based on minimal onboarding completion
if (minimalDone) {
  router.replace('/home');
} else {
  router.replace('/profile/create');
}
```

with:

```ts
// Normal flow: no invite outcome. `next` is the fallback destination
// a login-walled page asked for — validated again here, and only ever
// consulted after the consume attempt above.
const next = safeRelativePath(nextParam);
if (minimalDone) {
  router.replace(next ?? '/home');
} else if (next) {
  router.replace(`/profile/create?returnTo=${encodeURIComponent(next)}`);
} else {
  router.replace('/profile/create');
}
```

And extend the effect's dependency array (line 131) from:

```ts
  }, [session, status, router, invitationToken, libraryId, isRedirecting]);
```

to:

```ts
  }, [session, status, router, invitationToken, libraryId, nextParam, isRedirecting]);
```

- [ ] **Step 3: Run the sign-in page tests and typecheck**

Run: `npx vitest run src/app/auth/signin/__tests__/page.test.tsx && npx tsc --noEmit`
Expected: PASS / no type errors. (These tests cover the bound-email prefill paths and don't assert callbackUrl; they must not regress.)

- [ ] **Step 4: Commit**

```bash
git add src/app/auth/signin/page.tsx src/app/auth/callback/page.tsx
git commit -m "fix(auth): consume-invite always wins the post-auth route

?callbackUrl= no longer replaces /auth/callback — it rides along as a
validated next= fallback, honored only after the invite-consume attempt
(and still funneled through profile-create's returnTo when the profile
is minimal).

Why: the recorded invite run died on callbackUrl=/feedback — one stray tap discarded the invitation's whole purpose

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Fix 4 — sunset the legacy auto-sign-in path (§6.3)

**Files:**

- Test (create): `src/app/api/invitations/[token]/__tests__/route.test.ts`
- Modify (rewrite): `src/app/api/invitations/[token]/route.ts`
- Modify (rewrite): `src/app/api/auth/magic-link/route.ts`
- Modify (rewrite): `src/app/api/auth/magic-link/__tests__/route.test.ts`
- Delete: `src/lib/__tests__/magic-link-api.spec.ts` (DB-integration spec of the removed auto-join behavior)

Do NOT touch `src/lib/__tests__/magic-link.test.ts` or `src/lib/magic-link.ts` — `buildMagicSignInLink` is the _current_ one-tap code link inside auth-code emails, unrelated to the legacy invite auto-sign-in.

- [ ] **Step 1: Write the failing test for the legacy entry route**

Create `src/app/api/invitations/[token]/__tests__/route.test.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockHandleInviteLanding = vi.hoisted(() => vi.fn());

vi.mock('@/lib/invite', () => ({
  handleInviteLanding: mockHandleInviteLanding,
}));

import { GET } from '../route';

describe('GET /api/invitations/[token] — legacy entry, sunset (§6.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to the current invite landing instead of magic-link auto-sign-in', async () => {
    const landed = NextResponse.redirect(
      'http://localhost/library/lib_1?guest=1'
    );
    mockHandleInviteLanding.mockResolvedValue(landed);
    const request = new NextRequest('http://localhost/api/invitations/tok_abc');

    const res = await GET(request, {
      params: Promise.resolve({ token: 'tok_abc' }),
    });

    expect(mockHandleInviteLanding).toHaveBeenCalledWith(request, 'tok_abc');
    expect(res).toBe(landed);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run "src/app/api/invitations/[token]/__tests__/route.test.ts"`
Expected: FAIL — the current route queries the DB (unmocked `@/lib/db`) instead of delegating.

- [ ] **Step 3: Rewrite the legacy entry route**

Replace the entire contents of `src/app/api/invitations/[token]/route.ts` with:

```ts
import { type NextRequest } from 'next/server';

import { handleInviteLanding } from '@/lib/invite';

/**
 * Sunset (InviteFlows §6.3): this legacy entry point used to hand live
 * invites to /api/auth/magic-link, which auto-created the account from the
 * invitation's own email and auto-signed it in — authentication without any
 * proof from the invitee, contradicting the posture every current flow is
 * built on. Old emails still carry this URL, so the route stays alive as a
 * plain redirect into the current landing, where nobody is signed in without
 * typing a code. handleInviteLanding covers valid, expired, already-member,
 * and wrong-account uniformly.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  return handleInviteLanding(request, token);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run "src/app/api/invitations/[token]/__tests__/route.test.ts"`
Expected: PASS.

- [ ] **Step 5: Rewrite the magic-link route's tests to assert the sunset behavior**

Replace the entire contents of `src/app/api/auth/magic-link/__tests__/route.test.ts` with:

```ts
import { NextRequest } from 'next/server';
import { describe, it, expect } from 'vitest';

import { GET } from '../route';

function makeRequest(token?: string) {
  const url = token
    ? `http://localhost/api/auth/magic-link?token=${token}`
    : 'http://localhost/api/auth/magic-link';
  return new NextRequest(url);
}

describe('GET /api/auth/magic-link — sunset (§6.3)', () => {
  it('redirects a token into the current invite flow, creating and signing in nothing', async () => {
    const res = await GET(makeRequest('tok_abc'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/invite/tok_abc');
  });

  it('redirects home with invite=invalid when the token is missing', async () => {
    const res = await GET(makeRequest());

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      'http://localhost/?invite=invalid'
    );
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run src/app/api/auth/magic-link/__tests__/route.test.ts`
Expected: FAIL — the current route auto-creates a user and redirects to `/auth/signin?...`.

- [ ] **Step 7: Rewrite the magic-link route**

Replace the entire contents of `src/app/api/auth/magic-link/route.ts` with:

```ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * Sunset (InviteFlows §6.3). This endpoint used to be the auto-sign-in half
 * of the legacy invite flow: upsert the user from the invitation's email,
 * mint a session, join the library — all from a bare link click. That is
 * authentication without any proof from the invitee, and it contradicted the
 * no-auto-sign-in posture the current flow is built on. It now forwards into
 * the current landing (/invite/<token>), where claiming a card always means
 * typing a code. Kept only so bookmarked URLs degrade gracefully; deletable
 * once old emails have aged out.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/?invite=invalid', request.url));
  }
  return NextResponse.redirect(
    new URL(`/invite/${encodeURIComponent(token)}`, request.url)
  );
}
```

- [ ] **Step 8: Delete the obsolete DB-integration spec**

`src/lib/__tests__/magic-link-api.spec.ts` integration-tests the auto-create/auto-join behavior this task removes; both routes it imports are now thin redirects fully covered by the unit tests above.

```bash
git rm src/lib/__tests__/magic-link-api.spec.ts
```

- [ ] **Step 9: Run all affected tests**

Run: `npx vitest run src/app/api/auth/magic-link/__tests__/route.test.ts "src/app/api/invitations/[token]/__tests__/route.test.ts" src/lib/__tests__/magic-link.test.ts`
Expected: PASS, all files (magic-link.test.ts untouched and green).

- [ ] **Step 10: Commit**

```bash
git add "src/app/api/invitations/[token]/route.ts" "src/app/api/invitations/[token]/__tests__/route.test.ts" src/app/api/auth/magic-link/route.ts src/app/api/auth/magic-link/__tests__/route.test.ts
git commit -m "fix(auth): sunset the legacy invite auto-sign-in path

/api/invitations/[token] now delegates to handleInviteLanding and
/api/auth/magic-link forwards into /invite/<token>. No user is ever
authenticated without typing a code; old emails keep working, they just
land on the current flow (InviteFlows §6.3). The DB-integration spec of
the removed auto-join behavior goes with it.

Why: any email still in an inbox from the old era was a live contradiction of the no-auto-sign-in posture

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Final verification and PR

**Files:** none modified (unless verification finds regressions).

- [ ] **Step 1: Full unit suite vs. Task 1 baseline**

Run: `npm run test:unit 2>&1 | tail -30`
Expected: no failures beyond the Task 1 baseline list.

- [ ] **Step 2: Lint and typecheck**

Run: `npm run lint && npx tsc --noEmit`
Expected: clean (or only pre-existing warnings).

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin fix/invite-flow-ship-this-week
```

Open a PR to `main` titled `fix(invites): the four ship-this-week fixes from the redesign dossier`. Body: summarize the four fixes (one line each, citing InviteFlows §6.1/§6.3/§6.8 and the callbackUrl hijack), link the spec file, note the invariants explicitly (all seven untouched; binding checks remain server-side at consume and signed-in landing). End the body with:

```
Field-Note-Why:         six real invites produced zero joins; the dossier's audit traced the deaths to a callbackUrl hijack, a login wall, a dead filter, and a leftover auto-sign-in path
Field-Note-Interesting: nothing the invitee sees was load-bearing — every fix was experience-side; the seven server-side invariants never moved
Field-Note-Deferred:    the full redesign tier (front porch treatment, stamp/sign-card screens, email rebuild, sender-side funnel) — its own spec comes next

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

- [ ] **Step 4: Manual end-to-end pass (human)**

On the preview deployment: send a real bound invite, click it signed-out → expect the guest preview with the shelf; claim → sign-in shows the locked masked address; enter code → land inside the library (never `/home`, never "No memberships yet"). Also tap the feedback link mid-flow once to confirm the hijack is dead.

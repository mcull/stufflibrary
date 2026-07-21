# Library Invitations (Core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split library invitations into bound personal invites and bearer join codes, both addressed by short 8-character Crockford base32 codes at `/join/<code>`.

**Architecture:** A new `JoinCode` model handles broadcast joining (multi-use, rotatable, no expiry). The existing `Invitation` model keeps its per-recipient semantics and gains a `shortCode` plus email binding enforced in `/api/invite/consume`, where every entry path already converges. The 64-hex `/j/<token>` route is untouched and keeps working. Before any of that, the member roster stops leaking street addresses — a prerequisite, since join codes make the library reachable by strangers.

**Tech Stack:** Next.js 15 (App Router), Prisma 6 / PostgreSQL, NextAuth v4, Vitest + happy-dom, npm.

**Spec:** `docs/superpowers/specs/2026-07-20-library-invitations-design.md`

> **A note on the test sketches below.** They are a floor, not a ceiling. Task 2's original
> sketch passed against three of four deliberately broken implementations — including one that
> silently cut the keyspace from 2^40 to 2^32, which is the single property this feature's
> security rests on. One of its assertions compared generated output against the very constant
> that produced it, so it could not fail at all.
>
> Before marking any task done, **mutate the implementation and confirm the tests go red.** If a
> test still passes against code you deliberately broke, it is decoration. This applies especially
> to anything asserting a security property — those are the tests most likely to be trusted and
> least likely to be exercised.

**Scope note:** QR rendering, the flyer generator, and SMS compose are a separate plan. This one ends with a working, testable join flow.

---

## File Structure

**Create:**

- `src/lib/join-code.ts` — code generation, normalization, display formatting. Pure functions, no DB. One responsibility: turning bytes into codes and user input into lookup keys.
- `src/lib/__tests__/join-code.test.ts`
- `src/lib/join-code-service.ts` — DB operations on `JoinCode`: create, rotate, resolve, record a use.
- `src/lib/__tests__/join-code-service.test.ts`
- `src/app/join/[code]/route.ts` — the public landing route. Thin; delegates to `src/lib/invite.ts`.
- `src/app/api/collections/[id]/join-codes/route.ts` — owner-facing list + create.
- `src/app/api/collections/[id]/join-codes/[codeId]/rotate/route.ts` — rotation.
- `src/lib/__tests__/invite-binding.test.ts`
- `src/app/api/collections/[id]/members/__tests__/route.test.ts`

**Modify:**

- `src/app/api/collections/[id]/members/route.ts` — remove `email`, `address1`, `formattedAddress` from the default select.
- `prisma/schema.prisma` — add `JoinCode`, `Invitation.shortCode`, `CollectionMember.joinedViaCodeId`.
- `src/lib/invite.ts` — add `handleJoinCodeLanding`, add email binding to the shared accept path.
- `src/app/api/invite/consume/route.ts` — enforce binding, distinguish dead-invite from no-invite.
- `src/app/api/collections/[id]/invite/route.ts` — mint a `shortCode` alongside the token.

**Untouched by design:** `src/app/j/[token]/route.ts`, `src/app/invite/[token]/route.ts`.

---

## Task 1: Stop the roster leaking street addresses

This is first because it is a prerequisite, not a follow-up. Today any member can `curl` every other member's home address and email. That is defensible while the only door is a personal invite; it stops being defensible the moment a join code exists.

**Files:**

- Modify: `src/app/api/collections/[id]/members/route.ts:55-95`
- Test: `src/app/api/collections/[id]/members/__tests__/route.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindFirst = vi.hoisted(() => vi.fn());
const mockFindMany = vi.hoisted(() => vi.fn());
const mockFindUnique = vi.hoisted(() => vi.fn());
const mockGetServerSession = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  db: {
    collectionMember: { findFirst: mockFindFirst, findMany: mockFindMany },
    collection: { findFirst: mockFindFirst, findUnique: mockFindUnique },
  },
}));
vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

import { GET } from '../route';

describe('GET /api/collections/[id]/members', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindFirst.mockResolvedValue({ id: 'member-1', isActive: true });
    mockFindMany.mockResolvedValue([]);
    mockFindUnique.mockResolvedValue({ owner: null });
  });

  it('never selects email or street address for members', async () => {
    const req = new Request('http://localhost/api/collections/col-1/members');
    await GET(req as never, { params: Promise.resolve({ id: 'col-1' }) });

    const select = mockFindMany.mock.calls[0]![0].include.user.select;
    expect(select.email).toBeUndefined();
    expect(select.addresses.select.address1).toBeUndefined();
    expect(select.addresses.select.formattedAddress).toBeUndefined();
  });

  it('still selects city, state, and zip so the map keeps working', async () => {
    const req = new Request('http://localhost/api/collections/col-1/members');
    await GET(req as never, { params: Promise.resolve({ id: 'col-1' }) });

    const addr =
      mockFindMany.mock.calls[0]![0].include.user.select.addresses.select;
    expect(addr.city).toBe(true);
    expect(addr.state).toBe(true);
    expect(addr.zip).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/app/api/collections/\[id\]/members/__tests__/route.test.ts`
Expected: FAIL — both assertions, because `email`, `address1`, and `formattedAddress` are currently selected.

- [ ] **Step 3: Remove the three fields**

In `src/app/api/collections/[id]/members/route.ts`, in **both** select blocks (the member query around line 55 and the owner query around line 83), delete the `email: true,` line and reduce the address select to:

```ts
addresses: {
  where: { isActive: true },
  take: 1,
  select: {
    city: true,
    state: true,
    zip: true,
  },
},
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/app/api/collections/\[id\]/members/__tests__/route.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Find and fix consumers of the removed fields**

Run: `grep -rn "\.email\|address1\|formattedAddress" src/components/ManageMembersModal.tsx src/components/CollectionDetailClient.tsx`

Any UI reading `member.user.email` or a street address must stop. If the owner-facing management view genuinely needs contact details, that is a **separate owner-scoped response** — do not restore the fields to this one.

- [ ] **Step 6: Typecheck and commit**

```bash
npm run typecheck
git add src/app/api/collections/\[id\]/members/
git commit -m "fix(privacy): stop serving member street addresses and emails to every member

Why: join codes make the library reachable by strangers; a full roster of home addresses behind a QR code is not defensible"
```

---

## Task 2: Crockford base32 code generation

**Files:**

- Create: `src/lib/join-code.ts`
- Test: `src/lib/__tests__/join-code.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';

import {
  CROCKFORD_ALPHABET,
  JOIN_CODE_LENGTH,
  formatJoinCode,
  generateJoinCode,
  normalizeJoinCode,
} from '../join-code';

describe('generateJoinCode', () => {
  it('returns 8 characters by default', () => {
    expect(generateJoinCode()).toHaveLength(JOIN_CODE_LENGTH);
  });

  it('only ever emits alphabet characters', () => {
    for (let i = 0; i < 500; i++) {
      for (const ch of generateJoinCode()) {
        expect(CROCKFORD_ALPHABET).toContain(ch);
      }
    }
  });

  it('never emits I, L, O, or U', () => {
    for (let i = 0; i < 500; i++) {
      expect(generateJoinCode()).not.toMatch(/[ILOU]/);
    }
  });

  it('honours a longer length, so the space can grow later', () => {
    expect(generateJoinCode(10)).toHaveLength(10);
  });
});

describe('normalizeJoinCode', () => {
  it('uppercases and strips hyphens and spaces', () => {
    expect(normalizeJoinCode(' xkf7-2m9q ')).toBe('XKF72M9Q');
  });

  it('folds misread I and L to 1', () => {
    expect(normalizeJoinCode('IL345678')).toBe('11345678');
  });

  it('folds misread O to 0', () => {
    expect(normalizeJoinCode('OO345678')).toBe('00345678');
  });
});

describe('formatJoinCode', () => {
  it('hyphenates for display', () => {
    expect(formatJoinCode('XKF72M9Q')).toBe('XKF7-2M9Q');
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/lib/__tests__/join-code.test.ts`
Expected: FAIL — `Cannot find module '../join-code'`.

- [ ] **Step 3: Implement**

Create `src/lib/join-code.ts`:

```ts
import crypto from 'crypto';

/**
 * Crockford base32: excludes I, L, O and U. I/L/O are dropped because they are
 * misread as 1/0 in print; U is dropped because it makes accidental obscenity
 * far less likely on something printed fifty times.
 */
export const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const JOIN_CODE_LENGTH = 8;

/**
 * Substrings a generated code must not contain. Short and conservative — the
 * missing vowels already make most words unreachable. Expand as needed; the
 * cost of a false positive is one extra generation loop.
 */
const FORBIDDEN = ['5H1T', 'A55', 'D1CK', 'C0CK', 'B00B', '5EX', 'N4Z1'];

function containsForbidden(code: string): boolean {
  return FORBIDDEN.some((word) => code.includes(word));
}

/**
 * 256 is exactly 8 × 32, so `byte % 32` is uniform over the alphabet with no
 * modulo bias and no rejection sampling needed.
 */
export function generateJoinCode(length: number = JOIN_CODE_LENGTH): string {
  for (;;) {
    const bytes = crypto.randomBytes(length);
    let code = '';
    for (const byte of bytes) {
      code += CROCKFORD_ALPHABET[byte % 32];
    }
    if (!containsForbidden(code)) return code;
  }
}

/**
 * Turns anything a human might type or paste into the canonical lookup key.
 * Per Crockford, I and L decode to 1 and O decodes to 0, so a misread off a
 * printed flyer still resolves.
 */
export function normalizeJoinCode(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0');
}

/** Display form: XKF7-2M9Q. Never stored — storage is always unhyphenated. */
export function formatJoinCode(code: string): string {
  const mid = Math.ceil(code.length / 2);
  return `${code.slice(0, mid)}-${code.slice(mid)}`;
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/lib/__tests__/join-code.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/join-code.ts src/lib/__tests__/join-code.test.ts
git commit -m "feat(invites): Crockford base32 join code generation and normalization

Why: 64-hex tokens are unprintable and hostile in a text message; 8 Crockford chars give 2^40 and survive being read off paper"
```

---

## Task 3: Schema — JoinCode, shortCode, joinedViaCodeId

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the `JoinCode` model**

Append near the other library models:

```prisma
model JoinCode {
  id           String     @id @default(cuid())
  code         String     @unique
  collectionId String     @map("libraryId")
  createdById  String
  isActive     Boolean    @default(true)
  label        String?
  useCount     Int        @default(0)
  createdAt    DateTime   @default(now())
  rotatedAt    DateTime?
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  createdBy    User       @relation("JoinCodeCreator", fields: [createdById], references: [id])
  members      CollectionMember[]

  @@index([collectionId])
  @@map("join_codes")
}
```

No `expiresAt` — rotation is the only revocation. No unique constraint on `collectionId`: a library may have several live codes (a mailbox drop and a corkboard posting), so rotating one does not kill the other.

- [ ] **Step 2: Add the two new fields and back-relations**

On `Invitation` (`prisma/schema.prisma:98`), add:

```prisma
  shortCode      String?          @unique
```

On `CollectionMember` (`prisma/schema.prisma:169`), add:

```prisma
  joinedViaCodeId String?
  joinedViaCode   JoinCode? @relation(fields: [joinedViaCodeId], references: [id], onDelete: SetNull)
```

On `Collection`, add `joinCodes JoinCode[]`. On `User`, add `joinCodesCreated JoinCode[] @relation("JoinCodeCreator")`.

- [ ] **Step 3: Generate the migration**

Run: `npm run db:migrate -- --name join_codes_and_short_codes`
Expected: the safety check passes, then Prisma writes a migration under `prisma/migrations/` and regenerates the client.

`shortCode` is nullable because existing invitations have none; they keep resolving through `/j/<token>`.

- [ ] **Step 4: Verify the client typechecks**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add JoinCode, Invitation.shortCode, CollectionMember.joinedViaCodeId

Why: broadcast joining is a different object from a personal invite, and we want to know which flyer a member came in through"
```

---

## Task 4: Join code service — create, rotate, resolve

**Files:**

- Create: `src/lib/join-code-service.ts`
- Test: `src/lib/__tests__/join-code-service.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.hoisted(() => vi.fn());
const mockFindFirst = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  db: {
    joinCode: {
      create: mockCreate,
      findFirst: mockFindFirst,
      update: mockUpdate,
    },
  },
}));

import {
  createJoinCode,
  resolveJoinCode,
  rotateJoinCode,
} from '../join-code-service';

describe('createJoinCode', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stores an unhyphenated 8-character code', async () => {
    mockCreate.mockResolvedValue({ id: 'jc-1' });
    await createJoinCode('col-1', 'user-1', 'corkboard flyer');

    const data = mockCreate.mock.calls[0]![0].data;
    expect(data.code).toHaveLength(8);
    expect(data.code).not.toContain('-');
    expect(data.label).toBe('corkboard flyer');
  });
});

describe('resolveJoinCode', () => {
  beforeEach(() => vi.clearAllMocks());

  it('normalizes user input before lookup', async () => {
    mockFindFirst.mockResolvedValue({ id: 'jc-1', collectionId: 'col-1' });
    await resolveJoinCode('xkf7-2m9q');

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { code: 'XKF72M9Q', isActive: true },
    });
  });

  it('returns null for an inactive or unknown code', async () => {
    mockFindFirst.mockResolvedValue(null);
    expect(await resolveJoinCode('ZZZZZZZZ')).toBeNull();
  });
});

describe('createJoinCode collision handling', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retries with a fresh code when the unique constraint fires', async () => {
    const collision = Object.assign(new Error('unique'), { code: 'P2002' });
    mockCreate.mockRejectedValueOnce(collision).mockResolvedValueOnce({
      id: 'jc-2',
    });

    const created = await createJoinCode('col-1', 'user-1');

    expect(created).toEqual({ id: 'jc-2' });
    expect(mockCreate).toHaveBeenCalledTimes(2);
    // A retry that reuses the colliding code would loop forever.
    expect(mockCreate.mock.calls[0]![0].data.code).not.toBe(
      mockCreate.mock.calls[1]![0].data.code
    );
  });

  it('rethrows errors that are not collisions rather than burning retries', async () => {
    mockCreate.mockRejectedValue(new Error('connection lost'));
    await expect(createJoinCode('col-1', 'user-1')).rejects.toThrow(
      'connection lost'
    );
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});

describe('rotateJoinCode', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deactivates the old row and creates a replacement with the same label', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'jc-1',
      collectionId: 'col-1',
      label: 'corkboard flyer',
    });
    mockUpdate.mockResolvedValue({});
    mockCreate.mockResolvedValue({ id: 'jc-2' });

    await rotateJoinCode('jc-1', 'user-1');

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'jc-1' },
      data: { isActive: false, rotatedAt: expect.any(Date) },
    });
    expect(mockCreate.mock.calls[0]![0].data.label).toBe('corkboard flyer');
  });

  it('touches only the rotated row, so a library can hold several live codes', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'jc-mailers',
      collectionId: 'col-1',
      label: 'spring mailers',
    });
    mockUpdate.mockResolvedValue({});
    mockCreate.mockResolvedValue({ id: 'jc-mailers-2' });

    await rotateJoinCode('jc-mailers', 'user-1');

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.calls[0]![0].where).toEqual({ id: 'jc-mailers' });
  });

  it('returns null for an unknown code rather than creating an orphan', async () => {
    mockFindFirst.mockResolvedValue(null);
    expect(await rotateJoinCode('nope', 'user-1')).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/lib/__tests__/join-code-service.test.ts`
Expected: FAIL — `Cannot find module '../join-code-service'`.

- [ ] **Step 3: Implement**

Create `src/lib/join-code-service.ts`:

```ts
import { db } from '@/lib/db';
import { generateJoinCode, normalizeJoinCode } from '@/lib/join-code';

export interface ResolvedJoinCode {
  id: string;
  collectionId: string;
}

/**
 * Retries on the unique constraint. At 2^40 a collision is vanishingly
 * unlikely, but "vanishingly unlikely" surfaces to a user as a raw Prisma
 * error on a button click, and the recovery is one more random draw.
 */
export async function createJoinCode(
  collectionId: string,
  createdById: string,
  label?: string
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await db.joinCode.create({
        data: {
          code: generateJoinCode(),
          collectionId,
          createdById,
          label: label ?? null,
        },
      });
    } catch (error) {
      const isCollision =
        typeof error === 'object' &&
        error !== null &&
        (error as { code?: string }).code === 'P2002';
      if (!isCollision || attempt === 4) throw error;
    }
  }
  throw new Error('Failed to generate a unique join code');
}

export async function resolveJoinCode(
  input: string
): Promise<ResolvedJoinCode | null> {
  const code = normalizeJoinCode(input);
  const row = await db.joinCode.findFirst({ where: { code, isActive: true } });
  if (!row) return null;
  return { id: row.id, collectionId: row.collectionId };
}

/**
 * Rotation is the only revocation. The old row is deactivated rather than
 * deleted so the audit trail — and every member's joinedViaCodeId — survives.
 */
export async function rotateJoinCode(codeId: string, actorId: string) {
  const existing = await db.joinCode.findFirst({ where: { id: codeId } });
  if (!existing) return null;

  await db.joinCode.update({
    where: { id: codeId },
    data: { isActive: false, rotatedAt: new Date() },
  });

  return db.joinCode.create({
    data: {
      code: generateJoinCode(),
      collectionId: existing.collectionId,
      createdById: actorId,
      label: existing.label,
    },
  });
}

export async function recordJoinCodeUse(codeId: string) {
  await db.joinCode.update({
    where: { id: codeId },
    data: { useCount: { increment: 1 } },
  });
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/lib/__tests__/join-code-service.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/join-code-service.ts src/lib/__tests__/join-code-service.test.ts
git commit -m "feat(invites): join code create, resolve, and rotate

Why: rotation rather than expiry, because a flyer that dies after seven days is worse than useless"
```

---

## Task 5: Bind personal invites to their email

The comparison lives in `/api/invite/consume` because every entry path converges there. It cannot fail on the prefilled sign-in path — the address was locked to the invitation, so it matches by construction. It exists for OAuth sign-in under a different address, and for a forwardee arriving with a live 90-day session.

**Files:**

- Modify: `src/lib/invite.ts`
- Modify: `src/app/api/invite/consume/route.ts:44-70`
- Test: `src/lib/__tests__/invite-binding.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';

import { emailMatchesInvitation } from '../invite';

describe('emailMatchesInvitation', () => {
  it('matches identical addresses', () => {
    expect(emailMatchesInvitation('dave@example.com', 'dave@example.com')).toBe(
      true
    );
  });

  it('ignores case and surrounding whitespace', () => {
    expect(
      emailMatchesInvitation(' Dave@Example.COM ', 'dave@example.com')
    ).toBe(true);
  });

  it('rejects a different address — the forwarded-invite case', () => {
    expect(
      emailMatchesInvitation('stranger@example.com', 'dave@example.com')
    ).toBe(false);
  });

  it('rejects a missing session address rather than passing', () => {
    expect(emailMatchesInvitation(undefined, 'dave@example.com')).toBe(false);
    expect(emailMatchesInvitation(null, 'dave@example.com')).toBe(false);
  });
});

describe('maskEmail', () => {
  it('shows enough to be recognized and not enough to be harvested', async () => {
    const { maskEmail } = await import('../invite');
    expect(maskEmail('dave@example.com')).toBe('d•••@example.com');
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/lib/__tests__/invite-binding.test.ts`
Expected: FAIL — `emailMatchesInvitation is not a function`.

- [ ] **Step 3: Add both helpers to `src/lib/invite.ts`**

```ts
/**
 * Personal invites are bound to their address. Defaults to false on any
 * missing input — an absent session email must never satisfy the check.
 */
export function emailMatchesInvitation(
  sessionEmail: string | null | undefined,
  invitationEmail: string
): boolean {
  if (!sessionEmail) return false;
  return (
    sessionEmail.trim().toLowerCase() === invitationEmail.trim().toLowerCase()
  );
}

/** dave@example.com -> d•••@example.com */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '•••';
  return `${local[0]}•••@${domain}`;
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/lib/__tests__/invite-binding.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Widen `validateLibraryInvite` to return the invited address**

In `src/lib/invite.ts`, change the type at lines 55-57 and the query at 59-77 to carry `email`:

```ts
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
```

- [ ] **Step 5b: Enforce the match in `consume`**

In `src/app/api/invite/consume/route.ts`, insert after validation succeeds and **before** `ensureActiveMembership` (line 58):

```ts
const sessionEmail = (session.user as { email?: string }).email;
if (!emailMatchesInvitation(sessionEmail, validation.invitation.email)) {
  console.log('[invite/consume] email does not match invitation; refusing');
  return NextResponse.json(
    {
      redirect: null,
      error: 'invite_bound_to_other_email',
      invitedEmail: maskEmail(validation.invitation.email),
    },
    { status: 200 }
  );
}
```

Nothing is burned and no membership is created on this path.

- [ ] **Step 6: Distinguish a dead invite from no invite**

Still in `consume`, the existing `if (!validation.ok) return res;` at line 50 silently redirects a user to a library they are not a member of — which is what a mid-rotation join looks like. Replace it with:

```ts
if (!validation.ok) {
  console.log('[invite/consume] invite invalid or expired', validation.reason);
  return NextResponse.json(
    { redirect: null, error: `invite_${validation.reason}` },
    { status: 200 }
  );
}
```

- [ ] **Step 7: Handle both errors in the callback UI**

In `src/app/auth/callback/page.tsx:78-92`, the response body is currently only checked for `redirect`. Add, before that check:

```ts
if (body?.error === 'invite_bound_to_other_email') {
  router.replace(
    `/?invite=wrong_account&invited=${encodeURIComponent(body.invitedEmail ?? '')}`
  );
  return;
}
if (body?.error === 'invite_expired' || body?.error === 'invite_invalid') {
  router.replace('/?invite=expired');
  return;
}
```

- [ ] **Step 8: Run the full suite and commit**

```bash
npm run typecheck && npx vitest run src/lib
git add src/lib/invite.ts src/lib/__tests__/invite-binding.test.ts src/app/api/invite/consume/route.ts src/app/auth/callback/page.tsx
git commit -m "feat(invites): bind personal invitations to their email address

Why: a forwarded invite silently worked and burned Dave's seat for a stranger — full friction, none of the safety"
```

---

## Task 6: The `/join/[code]` route

**Files:**

- Create: `src/app/join/[code]/route.ts`
- Modify: `src/lib/invite.ts` — add `handleJoinCodeLanding`
- Create: `src/lib/join-code-rate-limit.ts`

- [ ] **Step 1: Add the rate limiter**

Create `src/lib/join-code-rate-limit.ts`:

```ts
import { rateLimit } from './rate-limit';

/**
 * Throttles FAILED lookups only. A code that resolves is not suspicious; a
 * sweep of codes that do not is exactly the enumeration attack the 8-character
 * length was chosen to make expensive. Together they are the guarantee.
 */
export const joinLookupLimiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
  name: 'join-lookup',
});
```

- [ ] **Step 2: Add `handleJoinCodeLanding` to `src/lib/invite.ts`**

```ts
import { resolveJoinCode } from './join-code-service';

/**
 * Join codes keep the guest preview: a stranger who scanned a flyer needs to
 * see the shelf before deciding to bother. Personal invites do not — see
 * handleInviteLanding.
 */
export async function handleJoinCodeLanding(
  request: NextRequest,
  rawCode: string
): Promise<NextResponse> {
  try {
    const resolved = await resolveJoinCode(rawCode);
    if (!resolved) {
      return NextResponse.redirect(new URL('/?invite=invalid', request.url));
    }

    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;

    if (userId) {
      const membership = await ensureActiveMembership(
        userId,
        resolved.collectionId
      );
      if (membership.created || membership.reactivated) {
        await db.collectionMember.updateMany({
          where: { userId, collectionId: resolved.collectionId },
          data: { joinedViaCodeId: resolved.id },
        });
        await recordJoinCodeUse(resolved.id);
      }
      return NextResponse.redirect(
        new URL(
          `/library/${resolved.collectionId}?message=joined_successfully`,
          request.url
        )
      );
    }

    const res = NextResponse.redirect(
      new URL(`/library/${resolved.collectionId}?guest=1`, request.url)
    );
    setInviteCookies(res, `jc:${resolved.id}`, resolved.collectionId);
    return res;
  } catch {
    return NextResponse.redirect(new URL('/?invite=error', request.url));
  }
}
```

The `jc:` cookie prefix is how `consume` tells a join code from an invitation token. Handle it there: on a `jc:`-prefixed value, skip the binding check entirely (join codes are bearer by design), set `joinedViaCodeId`, and call `recordJoinCodeUse` — do not burn anything.

- [ ] **Step 3: Create the route**

Create `src/app/join/[code]/route.ts`:

```ts
import { type NextRequest, NextResponse } from 'next/server';

import { handleInviteLanding, handleJoinCodeLanding } from '@/lib/invite';
import { joinLookupLimiter } from '@/lib/join-code-rate-limit';
import { normalizeJoinCode } from '@/lib/join-code';
import { db } from '@/lib/db';

function clientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const normalized = normalizeJoinCode(code);

  // Join codes first, then personal invite short codes. Both columns are
  // unique and indexed.
  const invitation = await db.invitation.findFirst({
    where: { shortCode: normalized },
    select: { token: true },
  });

  if (invitation?.token) {
    return handleInviteLanding(request, invitation.token);
  }

  const response = await handleJoinCodeLanding(request, normalized);

  // Only a miss counts against the limit.
  if (response.headers.get('location')?.includes('invite=invalid')) {
    try {
      await joinLookupLimiter.check(20, clientIp(request));
    } catch {
      return new NextResponse('Too many attempts', { status: 429 });
    }
  }

  return response;
}
```

- [ ] **Step 4: Verify by hand against a seeded code**

Run: `npm run dev`, then create a join code via Prisma Studio (`npm run db:studio`) and visit `http://localhost:3000/join/<code>` signed out.
Expected: redirect to `/library/<id>?guest=1`. Then try a hyphenated and lowercase form of the same code — both should work.

- [ ] **Step 5: Commit**

```bash
npm run typecheck
git add src/app/join src/lib/invite.ts src/lib/join-code-rate-limit.ts
git commit -m "feat(invites): /join/<code> route for join codes and invite short codes

Why: /j/<64 hex chars> is unprintable; this is the URL that goes on a flyer"
```

---

## Task 7: Mint short codes for personal invites, and skip the guest detour

**Files:**

- Modify: `src/app/api/collections/[id]/invite/route.ts:218-260`
- Modify: `src/lib/invite.ts` — `handleInviteLanding` unauthenticated branch

- [ ] **Step 1: Mint a `shortCode` alongside the token**

At `src/app/api/collections/[id]/invite/route.ts:218`, where `token` is generated, add:

```ts
const shortCode = liveShortCode ?? generateJoinCode();
```

following the same reuse logic already applied to `liveToken` at lines 207-217 — a still-live invite keeps its short code so an already-sent email stays valid. Persist `shortCode` on create and update, and change the share link at line 253 to:

```ts
const shareLink = `${process.env.NEXTAUTH_URL}/join/${shortCode}`;
```

- [ ] **Step 2: Send personal invitees to sign-in, not the guest preview**

In `src/lib/invite.ts`, replace the unauthenticated branch of `handleInviteLanding` (lines 147-151):

```ts
const res = NextResponse.redirect(new URL('/auth/signin', request.url));
setInviteCookies(res, token, libId);
res.cookies.set('invite_email', result.invitation.email, {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  maxAge: INVITE_COOKIE_MAX_AGE,
});
return res;
```

The address travels in an httpOnly cookie, **not** a query parameter — `?email=` would land in browser history and outbound `Referer` headers.

This requires `validateLibraryInvite` to return `email`, which Task 5 Step 5 already added.

- [ ] **Step 3: Add a cookie-backed invite context endpoint**

`src/app/auth/signin/page.tsx` is a **client component** (`'use client'` at line 1), so it cannot read an httpOnly cookie directly. It already fetches invite context from `/api/invitations/[token]/details` and prefills the email from it (lines 113-129) — but that path needs the token in the URL, which is exactly what we are trying to avoid.

Create `src/app/api/invite/context/route.ts`, which reads the cookies server-side:

```ts
import { type NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { validateLibraryInvite } from '@/lib/invite';

/** Returns the invited address for a pending invite cookie. No token in the URL. */
export async function GET(request: NextRequest) {
  const token = request.cookies.get('invite_token')?.value;
  if (!token || token.startsWith('jc:')) {
    return NextResponse.json({ invite: null });
  }

  const validation = await validateLibraryInvite(token);
  if (!validation.ok) return NextResponse.json({ invite: null });

  const library = await db.collection.findUnique({
    where: { id: validation.invitation.libraryId },
    select: { name: true },
  });

  return NextResponse.json({
    invite: {
      email: validation.invitation.email,
      libraryName: library?.name ?? null,
    },
  });
}
```

The `jc:` guard matters — join codes are bearer and have no address to prefill.

- [ ] **Step 3b: Prefill and lock the field**

In `src/app/auth/signin/page.tsx`, add an effect alongside the existing one at lines 113-129:

```ts
const [boundEmail, setBoundEmail] = useState<string | null>(null);

useEffect(() => {
  if (invitationToken || prefilledEmail) return; // legacy paths win
  fetch('/api/invite/context')
    .then((r) => r.json())
    .then((data) => {
      if (data?.invite?.email) {
        setBoundEmail(data.invite.email);
        setEmail(data.invite.email);
      }
    })
    .catch(() => {});
}, [invitationToken, prefilledEmail]);
```

Then pass `disabled={!!boundEmail}` to the email `TextField`, and render above it when `boundEmail` is set:

```tsx
{
  boundEmail && (
    <Typography variant="body2" sx={{ mb: 1, color: brandColors.charcoal }}>
      You were invited as <strong>{boundEmail}</strong>.
    </Typography>
  );
}
```

No edit affordance — that is what binding means. Clear `invite_email` in `consume` alongside the other cookies.

- [ ] **Step 4: Walk the flow by hand**

Run: `npm run dev`. Invite an address you control from a library you own, open the emailed `/join/XXXXXXXX` in a private window.
Expected: straight to sign-in with the address filled and locked — no guest preview. Complete sign-in and land in the library as a member.

Check the address bar at every hop: **the invited address must never appear in a URL.** If you see `?email=` you have wired the legacy magic-link path instead of `/api/invite/context`, and the address is now in browser history and outbound `Referer` headers.

- [ ] **Step 5: Confirm the forwarding case fails closed**

Sign in as a _different_ user in another private window, then open the same link.
Expected: no membership, invite not burned, redirect carrying `invite=wrong_account`.

- [ ] **Step 6: Commit**

```bash
npm run typecheck && npx vitest run
git add src/app/api/collections/\[id\]/invite/route.ts src/lib/invite.ts src/app/auth/signin
git commit -m "feat(invites): short codes on personal invites, and drop their guest detour

Why: Dave asked to join a specific library — a preview of it is answering a question he didn't ask"
```

---

## Task 8: Owner-facing join code endpoints

**Files:**

- Create: `src/app/api/collections/[id]/join-codes/route.ts`
- Create: `src/app/api/collections/[id]/join-codes/[codeId]/rotate/route.ts`

- [ ] **Step 1: List and create**

Create `src/app/api/collections/[id]/join-codes/route.ts`. Gate both verbs on `getUserCapabilities(userId, { libraryId })` → `caps.canInvite`, matching `src/app/api/collections/[id]/invite/route.ts:98-110`. `GET` returns active codes with `id`, `code`, `label`, `useCount`, `createdAt`. `POST` accepts `{ label?: string }` and calls `createJoinCode`.

**`GET` must return every active code, never collapsed by label.** Rotation creates the replacement before deactivating the old row, so a failed deactivation deliberately leaves two live codes sharing a label — a survivable state, but only because the admin can see it and rotate again. Deduplicating or grouping by label here would hide exactly the failure this ordering was chosen to make visible. Add a test that two active codes with the same label both appear in the response.

```ts
import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { getUserCapabilities } from '@/lib/capabilities';
import { createJoinCode } from '@/lib/join-code-service';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const caps = await getUserCapabilities(userId, { libraryId: id });
  if (!caps.canInvite) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const codes = await db.joinCode.findMany({
    where: { collectionId: id, isActive: true },
    select: {
      id: true,
      code: true,
      label: true,
      useCount: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ codes });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const caps = await getUserCapabilities(userId, { libraryId: id });
  if (!caps.canInvite) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { label?: string };
  const created = await createJoinCode(id, userId, body.label);
  return NextResponse.json({ code: created }, { status: 201 });
}
```

- [ ] **Step 2: Rotation**

Create `src/app/api/collections/[id]/join-codes/[codeId]/rotate/route.ts`:

```ts
import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { getUserCapabilities } from '@/lib/capabilities';
import { rotateJoinCode } from '@/lib/join-code-service';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; codeId: string }> }
) {
  const { id, codeId } = await params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const caps = await getUserCapabilities(userId, { libraryId: id });
  if (!caps.canInvite) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const replacement = await rotateJoinCode(codeId, userId);
  if (!replacement) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ code: replacement });
}
```

The confirmation copy — _"corkboard flyer — used 14 times. Anyone holding a flyer with XKF7-2M9Q won't be able to join."_ — belongs in the UI that calls this, which is the artifacts plan. The endpoint just rotates.

- [ ] **Step 3: Verify the capability gate**

Run: `npm run dev`, then `curl` the POST endpoint as a non-member.
Expected: `403`.

- [ ] **Step 4: Commit**

```bash
npm run typecheck && npx vitest run
git add src/app/api/collections/\[id\]/join-codes
git commit -m "feat(invites): owner endpoints to list, create, and rotate join codes"
```

---

## Done when

- `npx vitest run` passes.
- `npm run typecheck` is clean.
- A join code can be created, used by two different people, and rotated — after which the old code 404s and the new one works.
- A personal invite opened by the wrong signed-in account grants nothing and burns nothing.
- `GET /api/collections/<id>/members` returns no `email`, `address1`, or `formattedAddress`.
- Every pre-existing `/j/<token>` link still works.

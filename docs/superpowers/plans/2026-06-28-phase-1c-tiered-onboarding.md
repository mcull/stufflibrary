# Phase 1C — Tiered Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all-or-nothing signup with a graduated-capability model — low-friction minimal entry, then unlock lend/borrow/create-library on profile completeness and gate member-invite + a concurrent-borrow cap on the 1B trust tier.

**Architecture:** A single pure `src/lib/capabilities.ts` holds all gating policy (`getCapabilities(facts)` + tunable constant maps). A thin server helper `getUserCapabilities(userId, ctx)` derives facts from the DB and runs the live open-borrow count. Gated API routes and the UI both call into it so enforcement and locked-state rendering never diverge. The wizard is split so name + terms lands a user in the app; photo + verified address are collected just-in-time on first lend/borrow/create-library.

**Tech Stack:** Next.js App Router, Prisma, NextAuth, MUI, React Hook Form + Zod, Vitest (with `vi.hoisted` db mocks, mirroring `src/lib/__tests__/trust-score.test.ts`).

**Spec:** `docs/superpowers/specs/2026-06-28-phase-1c-tiered-onboarding-design.md` · **Issue:** #367

---

## File Structure

**Create:**

- `src/lib/capabilities.ts` — pure policy: `getCapabilities`, `CapabilityFacts`, `Capabilities`, `CapabilityReason`, `CONCURRENT_BORROW_LIMITS`, `MIN_TIER_TO_INVITE`, `TERMS_VERSION`, `hasMinimalProfile`.
- `src/lib/__tests__/capabilities.test.ts` — exhaustive unit tests for the pure function.
- `src/lib/user-capabilities.ts` — server helper `getUserCapabilities(userId, ctx?)` (loads user/address/borrow-count/membership → `Capabilities`).
- `src/lib/__tests__/user-capabilities.test.ts` — db-mocked tests for the helper.

**Modify:**

- `prisma/schema.prisma` — add `User.agreedToTermsAt`, `User.agreedTermsVersion`.
- `src/app/api/profile/route.ts` — persist terms; add a `minimal` mode that sets `onboardingStep='minimal'` without `profileCompleted`.
- `src/app/stacks/page.tsx`, `src/app/profile/page.tsx`, `src/app/profile/edit/page.tsx`, `src/app/auth/callback/page.tsx` — gate redirects on **minimal** completion, not full.
- `src/app/api/items/route.ts` (+ `create-draft/route.ts`, `create-with-watercolor/route.ts`) — require `canLend`.
- `src/app/api/borrow-requests/route.ts` — require `canBorrow` + enforce the concurrent cap.
- `src/app/api/collections/route.ts` — POST requires `canCreateLibrary`.
- `src/app/api/collections/[id]/invite/route.ts` — non-owner member requires `canInvite` (tier ≥ TRUSTED).
- `src/components/ProfileWizard.tsx` + `ProfileCreationHandler.tsx` — minimal-first flow.
- Client surfaces for JIT prompts + locked affordances (Task 12).

---

## Task 1: Pure capability policy module

**Files:**

- Create: `src/lib/capabilities.ts`
- Test: `src/lib/__tests__/capabilities.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/__tests__/capabilities.test.ts
import { describe, it, expect } from 'vitest';

import {
  getCapabilities,
  hasMinimalProfile,
  CONCURRENT_BORROW_LIMITS,
  type CapabilityFacts,
} from '../capabilities';

const full: CapabilityFacts = {
  hasName: true,
  hasAcceptedTerms: true,
  hasPhoto: true,
  hasVerifiedAddress: true,
  trustTier: 'NEW',
  openBorrowCount: 0,
  isLibraryOwnerOrAdmin: false,
};

describe('getCapabilities — completeness axis', () => {
  it('minimal profile (name + terms) can enter but cannot lend/borrow/create', () => {
    const c = getCapabilities({
      ...full,
      hasPhoto: false,
      hasVerifiedAddress: false,
    });
    expect(c.canEnter).toBe(true);
    expect(c.canLend).toBe(false);
    expect(c.canBorrow).toBe(false);
    expect(c.canCreateLibrary).toBe(false);
    expect(c.reasons.canLend).toBe('NEEDS_PHOTO');
  });

  it('missing terms blocks entry and reports NEEDS_TERMS', () => {
    const c = getCapabilities({ ...full, hasAcceptedTerms: false });
    expect(c.canEnter).toBe(false);
    expect(c.reasons.canBorrow).toBe('NEEDS_TERMS');
  });

  it('photo present but address missing reports NEEDS_ADDRESS', () => {
    const c = getCapabilities({ ...full, hasVerifiedAddress: false });
    expect(c.canLend).toBe(false);
    expect(c.reasons.canLend).toBe('NEEDS_ADDRESS');
  });

  it('full profile unlocks lend, borrow, and create-library', () => {
    const c = getCapabilities(full);
    expect(c.canLend).toBe(true);
    expect(c.canBorrow).toBe(true);
    expect(c.canCreateLibrary).toBe(true);
    expect(c.reasons.canLend).toBeUndefined();
  });
});

describe('getCapabilities — trust axis', () => {
  it('per-tier concurrent borrow limits', () => {
    expect(
      getCapabilities({ ...full, trustTier: 'NEW' }).concurrentBorrowLimit
    ).toBe(2);
    expect(
      getCapabilities({ ...full, trustTier: 'BUILDING' }).concurrentBorrowLimit
    ).toBe(4);
    expect(
      getCapabilities({ ...full, trustTier: 'TRUSTED' }).concurrentBorrowLimit
    ).toBe(8);
    expect(
      getCapabilities({ ...full, trustTier: 'HIGHLY_TRUSTED' })
        .concurrentBorrowLimit
    ).toBe(20);
  });

  it('null tier is treated as NEW', () => {
    expect(
      getCapabilities({ ...full, trustTier: null }).concurrentBorrowLimit
    ).toBe(2);
  });

  it('at the borrow limit, canBorrow is false with AT_BORROW_LIMIT', () => {
    const c = getCapabilities({
      ...full,
      trustTier: 'NEW',
      openBorrowCount: 2,
    });
    expect(c.atBorrowLimit).toBe(true);
    expect(c.canBorrow).toBe(false);
    expect(c.reasons.canBorrow).toBe('AT_BORROW_LIMIT');
  });

  it('below the limit, a full-profile NEW user can borrow', () => {
    const c = getCapabilities({
      ...full,
      trustTier: 'NEW',
      openBorrowCount: 1,
    });
    expect(c.canBorrow).toBe(true);
  });

  it('non-owner member below TRUSTED cannot invite', () => {
    const c = getCapabilities({
      ...full,
      trustTier: 'BUILDING',
      isLibraryOwnerOrAdmin: false,
    });
    expect(c.canInvite).toBe(false);
    expect(c.reasons.canInvite).toBe('NEEDS_TRUST_TIER');
  });

  it('TRUSTED member can invite', () => {
    expect(getCapabilities({ ...full, trustTier: 'TRUSTED' }).canInvite).toBe(
      true
    );
    expect(
      getCapabilities({ ...full, trustTier: 'HIGHLY_TRUSTED' }).canInvite
    ).toBe(true);
  });

  it('library owner/admin can invite regardless of tier', () => {
    const c = getCapabilities({
      ...full,
      trustTier: 'NEW',
      isLibraryOwnerOrAdmin: true,
    });
    expect(c.canInvite).toBe(true);
    expect(c.reasons.canInvite).toBeUndefined();
  });
});

describe('hasMinimalProfile', () => {
  it('true when name + terms present', () => {
    expect(hasMinimalProfile({ name: 'A', agreedToTermsAt: new Date() })).toBe(
      true
    );
  });
  it('false when name missing', () => {
    expect(hasMinimalProfile({ name: null, agreedToTermsAt: new Date() })).toBe(
      false
    );
  });
  it('false when terms not accepted', () => {
    expect(hasMinimalProfile({ name: 'A', agreedToTermsAt: null })).toBe(false);
  });
});

describe('CONCURRENT_BORROW_LIMITS is the tunable source of truth', () => {
  it('exposes a limit for every tier', () => {
    expect(Object.keys(CONCURRENT_BORROW_LIMITS).sort()).toEqual([
      'BUILDING',
      'HIGHLY_TRUSTED',
      'NEW',
      'TRUSTED',
    ]);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run src/lib/__tests__/capabilities.test.ts`
Expected: FAIL — `Cannot find module '../capabilities'`.

- [ ] **Step 3: Implement the module**

```ts
// src/lib/capabilities.ts
import type { TrustTier } from './trust-score';

/** Bump when the terms-of-service text changes so users re-accept. */
export const TERMS_VERSION = '2026-06-28';

/** Tunable: max simultaneous open borrows per trust tier. */
export const CONCURRENT_BORROW_LIMITS: Record<TrustTier, number> = {
  NEW: 2,
  BUILDING: 4,
  TRUSTED: 8,
  HIGHLY_TRUSTED: 20,
};

/** Minimum trust tier a non-owner member needs to invite others. */
export const MIN_TIER_TO_INVITE: TrustTier = 'TRUSTED';

const TIER_RANK: Record<TrustTier, number> = {
  NEW: 0,
  BUILDING: 1,
  TRUSTED: 2,
  HIGHLY_TRUSTED: 3,
};

export type CapabilityReason =
  | 'NEEDS_NAME'
  | 'NEEDS_TERMS'
  | 'NEEDS_PHOTO'
  | 'NEEDS_ADDRESS'
  | 'NEEDS_TRUST_TIER'
  | 'AT_BORROW_LIMIT';

export interface CapabilityFacts {
  hasName: boolean;
  hasAcceptedTerms: boolean;
  hasPhoto: boolean;
  hasVerifiedAddress: boolean;
  trustTier: TrustTier | null;
  openBorrowCount: number;
  isLibraryOwnerOrAdmin: boolean;
}

type GatedCapability =
  | 'canLend'
  | 'canBorrow'
  | 'canCreateLibrary'
  | 'canInvite';

export interface Capabilities {
  canEnter: boolean;
  canLend: boolean;
  canBorrow: boolean;
  canCreateLibrary: boolean;
  canInvite: boolean;
  concurrentBorrowLimit: number;
  atBorrowLimit: boolean;
  reasons: Partial<Record<GatedCapability, CapabilityReason>>;
}

/** First missing completeness signal, or undefined if the profile is full. */
function completenessReason(f: CapabilityFacts): CapabilityReason | undefined {
  if (!f.hasAcceptedTerms) return 'NEEDS_TERMS';
  if (!f.hasName) return 'NEEDS_NAME';
  if (!f.hasPhoto) return 'NEEDS_PHOTO';
  if (!f.hasVerifiedAddress) return 'NEEDS_ADDRESS';
  return undefined;
}

export function getCapabilities(f: CapabilityFacts): Capabilities {
  const effectiveTier: TrustTier = f.trustTier ?? 'NEW';
  const concurrentBorrowLimit = CONCURRENT_BORROW_LIMITS[effectiveTier];
  const atBorrowLimit = f.openBorrowCount >= concurrentBorrowLimit;

  const canEnter = f.hasName && f.hasAcceptedTerms;
  const incomplete = completenessReason(f);
  const isFull = incomplete === undefined;

  const canLend = isFull;
  const canCreateLibrary = isFull;
  const canBorrow = isFull && !atBorrowLimit;
  const canInvite =
    f.isLibraryOwnerOrAdmin ||
    TIER_RANK[effectiveTier] >= TIER_RANK[MIN_TIER_TO_INVITE];

  const reasons: Partial<Record<GatedCapability, CapabilityReason>> = {};
  if (!canLend && incomplete) reasons.canLend = incomplete;
  if (!canCreateLibrary && incomplete) reasons.canCreateLibrary = incomplete;
  if (!canBorrow) reasons.canBorrow = incomplete ?? 'AT_BORROW_LIMIT';
  if (!canInvite) reasons.canInvite = 'NEEDS_TRUST_TIER';

  return {
    canEnter,
    canLend,
    canBorrow,
    canCreateLibrary,
    canInvite,
    concurrentBorrowLimit,
    atBorrowLimit,
    reasons,
  };
}

/** Has the user done the minimal step (name + accepted terms)? */
export function hasMinimalProfile(u: {
  name: string | null;
  agreedToTermsAt: Date | null;
}): boolean {
  return Boolean(u.name && u.name.trim() && u.agreedToTermsAt);
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run src/lib/__tests__/capabilities.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/capabilities.ts src/lib/__tests__/capabilities.test.ts
git commit -m "feat(1c): pure capability policy module (#367)"
```

---

## Task 2: Migration — persist terms acceptance

**Files:**

- Modify: `prisma/schema.prisma` (User model, near `onboardingStep`)

- [ ] **Step 1: Add the fields to the schema**

In `model User`, immediately after the `onboardingStep String?` line, add:

```prisma
  agreedToTermsAt     DateTime?
  agreedTermsVersion  String?
```

- [ ] **Step 2: Create the migration**

Run: `npx prisma migrate dev --name add_terms_acceptance`
Expected: a new folder `prisma/migrations/<timestamp>_add_terms_acceptance/` with `ALTER TABLE "users" ADD COLUMN "agreedToTermsAt" ...` and Prisma Client regenerated.

> Local-DB note (see infra-gotchas memory): the local `DATABASE_URL` points at localhost. If no local Postgres is reachable, run `npx prisma migrate dev` against a reachable DB or generate SQL with `--create-only` then apply on the staging/preview DB. Do **not** point this at production.

- [ ] **Step 3: Verify the client typechecks**

Run: `npx prisma generate && npx tsc --noEmit -p tsconfig.json 2>&1 | head`
Expected: no errors referencing `agreedToTermsAt`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(1c): add agreedToTermsAt/agreedTermsVersion to User (#367)"
```

---

## Task 3: Server helper — `getUserCapabilities`

**Files:**

- Create: `src/lib/user-capabilities.ts`
- Test: `src/lib/__tests__/user-capabilities.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/__tests__/user-capabilities.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockAddressFindUnique = vi.hoisted(() => vi.fn());
const mockBorrowCount = vi.hoisted(() => vi.fn());
const mockCollectionFindFirst = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: mockUserFindUnique },
    address: { findUnique: mockAddressFindUnique },
    borrowRequest: { count: mockBorrowCount },
    collection: { findFirst: mockCollectionFindFirst },
  },
}));

import {
  getUserCapabilities,
  OPEN_BORROW_STATUSES,
} from '../user-capabilities';

beforeEach(() => {
  vi.clearAllMocks();
  mockUserFindUnique.mockResolvedValue({
    name: 'Jo',
    image: 'https://img/x.png',
    agreedToTermsAt: new Date(),
    currentAddressId: 'addr1',
    trustTier: 'NEW',
  });
  mockAddressFindUnique.mockResolvedValue({
    isActive: true,
    verificationMethod: 'google_places',
  });
  mockBorrowCount.mockResolvedValue(0);
  mockCollectionFindFirst.mockResolvedValue(null);
});

describe('getUserCapabilities', () => {
  it('derives a full-profile NEW user who can lend and borrow', async () => {
    const c = await getUserCapabilities('u1');
    expect(c.canLend).toBe(true);
    expect(c.canBorrow).toBe(true);
    expect(c.concurrentBorrowLimit).toBe(2);
  });

  it('counts only open borrow statuses', async () => {
    await getUserCapabilities('u1');
    expect(mockBorrowCount).toHaveBeenCalledWith({
      where: { borrowerId: 'u1', status: { in: OPEN_BORROW_STATUSES } },
    });
  });

  it('an unverified address means not full profile', async () => {
    mockAddressFindUnique.mockResolvedValue({
      isActive: true,
      verificationMethod: null,
    });
    const c = await getUserCapabilities('u1');
    expect(c.canLend).toBe(false);
    expect(c.reasons.canLend).toBe('NEEDS_ADDRESS');
  });

  it('missing currentAddressId means not full profile', async () => {
    mockUserFindUnique.mockResolvedValue({
      name: 'Jo',
      image: 'x',
      agreedToTermsAt: new Date(),
      currentAddressId: null,
      trustTier: 'NEW',
    });
    const c = await getUserCapabilities('u1');
    expect(c.canBorrow).toBe(false);
    expect(mockAddressFindUnique).not.toHaveBeenCalled();
  });

  it('at the NEW borrow cap, canBorrow is false', async () => {
    mockBorrowCount.mockResolvedValue(2);
    const c = await getUserCapabilities('u1');
    expect(c.atBorrowLimit).toBe(true);
    expect(c.canBorrow).toBe(false);
  });

  it('sets isLibraryOwnerOrAdmin when libraryId context matches owner/admin', async () => {
    mockCollectionFindFirst.mockResolvedValue({ id: 'lib1' });
    const c = await getUserCapabilities('u1', { libraryId: 'lib1' });
    expect(c.canInvite).toBe(true);
  });

  it('returns canEnter=false for an unknown user', async () => {
    mockUserFindUnique.mockResolvedValue(null);
    const c = await getUserCapabilities('ghost');
    expect(c.canEnter).toBe(false);
    expect(c.canLend).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run src/lib/__tests__/user-capabilities.test.ts`
Expected: FAIL — `Cannot find module '../user-capabilities'`.

- [ ] **Step 3: Implement the helper**

```ts
// src/lib/user-capabilities.ts
import {
  getCapabilities,
  type Capabilities,
  type CapabilityFacts,
} from './capabilities';
import { db } from './db';
import type { TrustTier } from './trust-score';

/** BorrowRequest statuses that count as an "open" borrow for the cap. */
export const OPEN_BORROW_STATUSES = [
  'PENDING',
  'APPROVED',
  'ACTIVE',
  'RETURN_PENDING',
] as const;

const EMPTY_FACTS: CapabilityFacts = {
  hasName: false,
  hasAcceptedTerms: false,
  hasPhoto: false,
  hasVerifiedAddress: false,
  trustTier: null,
  openBorrowCount: 0,
  isLibraryOwnerOrAdmin: false,
};

export async function getUserCapabilities(
  userId: string,
  ctx?: { libraryId?: string }
): Promise<Capabilities> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      image: true,
      agreedToTermsAt: true,
      currentAddressId: true,
      trustTier: true,
    },
  });

  if (!user) return getCapabilities(EMPTY_FACTS);

  let hasVerifiedAddress = false;
  if (user.currentAddressId) {
    const addr = await db.address.findUnique({
      where: { id: user.currentAddressId },
      select: { isActive: true, verificationMethod: true },
    });
    hasVerifiedAddress = Boolean(addr?.isActive && addr.verificationMethod);
  }

  const openBorrowCount = await db.borrowRequest.count({
    where: { borrowerId: userId, status: { in: OPEN_BORROW_STATUSES } },
  });

  let isLibraryOwnerOrAdmin = false;
  if (ctx?.libraryId) {
    const owned = await db.collection.findFirst({
      where: {
        id: ctx.libraryId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId, role: 'admin', isActive: true } } },
        ],
      },
      select: { id: true },
    });
    isLibraryOwnerOrAdmin = Boolean(owned);
  }

  return getCapabilities({
    hasName: Boolean(user.name && user.name.trim()),
    hasAcceptedTerms: Boolean(user.agreedToTermsAt),
    hasPhoto: Boolean(user.image),
    hasVerifiedAddress,
    trustTier: (user.trustTier as TrustTier | null) ?? null,
    openBorrowCount,
    isLibraryOwnerOrAdmin,
  });
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run src/lib/__tests__/user-capabilities.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/user-capabilities.ts src/lib/__tests__/user-capabilities.test.ts
git commit -m "feat(1c): getUserCapabilities server helper (#367)"
```

---

## Task 4: Persist terms + minimal mode in the profile API

**Files:**

- Modify: `src/app/api/profile/route.ts`
- Test: `src/app/api/profile/__tests__/route.test.ts` (create if absent — check first with `ls src/app/api/profile/__tests__ 2>/dev/null`)

- [ ] **Step 1: Write the failing test**

If a profile route test file exists, add these cases; otherwise create the file. Mirror the db-mock style from `trust-score.test.ts`.

```ts
// src/app/api/profile/__tests__/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockGetServerSession = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
      create: vi.fn(),
    },
    address: { updateMany: vi.fn(), create: vi.fn() },
    $transaction: async (fn: any) =>
      fn({
        address: { updateMany: vi.fn(), create: vi.fn() },
        user: { update: mockUserUpdate },
      }),
  },
}));
vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

import { POST } from '../route';

function req(body: unknown) {
  return new Request('http://t/api/profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({
    user: { id: 'u1', email: 'a@b.c' },
  });
  mockUserFindUnique.mockResolvedValue({ id: 'u1' });
  mockUserUpdate.mockResolvedValue({
    id: 'u1',
    name: 'Jo',
    onboardingStep: 'minimal',
  });
});

describe('POST /api/profile minimal mode', () => {
  it('with mode=minimal sets onboardingStep=minimal and agreedToTermsAt, not profileCompleted', async () => {
    const res = await POST(
      req({ mode: 'minimal', name: 'Jo', agreedToTerms: true })
    );
    expect(res.status).toBe(200);
    const arg = mockUserUpdate.mock.calls[0][0].data;
    expect(arg.onboardingStep).toBe('minimal');
    expect(arg.agreedToTermsAt).toBeInstanceOf(Date);
    expect(arg.profileCompleted).toBeUndefined();
  });

  it('minimal mode rejects when terms not accepted', async () => {
    const res = await POST(
      req({ mode: 'minimal', name: 'Jo', agreedToTerms: false })
    );
    expect(res.status).toBe(400);
  });
});

describe('POST /api/profile full mode persists terms', () => {
  it('full completion sets agreedToTermsAt and profileCompleted', async () => {
    const res = await POST(
      req({ name: 'Jo', address: '1 St', agreedToTerms: true })
    );
    expect(res.status).toBe(200);
    const arg = mockUserUpdate.mock.calls[0][0].data;
    expect(arg.profileCompleted).toBe(true);
    expect(arg.agreedToTermsAt).toBeInstanceOf(Date);
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `npx vitest run src/app/api/profile/__tests__/route.test.ts`
Expected: FAIL (no `mode` handling; terms not persisted).

- [ ] **Step 3: Implement**

In `src/app/api/profile/route.ts`:

a) Import the terms constant at the top:

```ts
import { TERMS_VERSION } from '@/lib/capabilities';
```

b) Extend `createProfileSchema` with the terms + mode fields:

```ts
const createProfileSchema = z.object({
  mode: z.enum(['minimal', 'full']).optional().default('full'),
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
  agreedToTerms: z.boolean().optional().default(false),
  bio: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().optional()
  ),
  shareInterests: z.array(z.string()).optional().default([]),
  borrowInterests: z.array(z.string()).optional().default([]),
  image: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().url().optional()
  ),
  parsedAddress: z /* unchanged object schema */
    .object({
      place_id: z.string().nullable().optional(),
      formatted_address: z.string().nullable().optional(),
      address1: z.string().nullable().optional(),
      address2: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      state: z.string().nullable().optional(),
      zip: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
    })
    .optional(),
});
```

c) Right after `const validatedData = createProfileSchema.parse(body);`, branch on minimal mode **before** the address transaction:

```ts
if (validatedData.mode === 'minimal') {
  if (!validatedData.agreedToTerms) {
    return NextResponse.json(
      { error: 'You must accept the terms to continue' },
      { status: 400 }
    );
  }
  const minimalUser = await db.user.update({
    where: { id: user.id },
    data: {
      name: validatedData.name,
      onboardingStep: 'minimal',
      agreedToTermsAt: new Date(),
      agreedTermsVersion: TERMS_VERSION,
    },
  });
  return NextResponse.json({
    success: true,
    user: {
      id: minimalUser.id,
      name: minimalUser.name,
      onboardingStep: 'minimal',
    },
  });
}
```

d) In the existing full-path `tx.user.update({ ... data: { ... } })`, add terms persistence alongside `profileCompleted: true` / `onboardingStep: 'complete'`:

```ts
          profileCompleted: true,
          onboardingStep: 'complete',
          agreedToTermsAt: new Date(),
          agreedTermsVersion: TERMS_VERSION,
```

- [ ] **Step 4: Run, verify pass**

Run: `npx vitest run src/app/api/profile/__tests__/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/profile/route.ts src/app/api/profile/__tests__/route.test.ts
git commit -m "feat(1c): persist terms + minimal-mode in profile API (#367)"
```

---

## Task 5: Gate app-entry redirects on minimal completion

**Files:**

- Modify: `src/app/stacks/page.tsx:65-66`, `src/app/profile/page.tsx:70-71`, `src/app/profile/edit/page.tsx:60-61`, `src/app/auth/callback/page.tsx`

These are server components / a client callback; behavior is verified by Task 13 (manual preview) plus the unit-level guard below. Extract the rule into the pure `hasMinimalProfile` from Task 1 so it stays testable.

- [ ] **Step 1: Add a fields to each server query + swap the guard**

In `src/app/stacks/page.tsx`, the user `select` (around line 39/54) must include `name` and `agreedToTermsAt`. Then replace:

```ts
if (!user.profileCompleted) {
  redirect('/profile/create');
}
```

with:

```ts
if (!hasMinimalProfile(user)) {
  redirect('/profile/create');
}
```

and add the import: `import { hasMinimalProfile } from '@/lib/capabilities';`

Apply the identical change in `src/app/profile/page.tsx` and `src/app/profile/edit/page.tsx` (ensure each user `select` includes `name` and `agreedToTermsAt`).

- [ ] **Step 2: Update the client callback**

In `src/app/auth/callback/page.tsx`, the page fetches the user (via `/api/profile` or session). Replace each `user.profileCompleted` branch that decides **app entry** (the "Normal flow based on profile completion" block, ~line 88-92, and the invite-cookie block ~line 74-80) so a **minimal** user is allowed into `/stacks` / the destination instead of bounced to `/profile/create`:

```ts
// Normal flow based on minimal-onboarding completion
const minimalDone = Boolean(user?.name && user?.agreedToTermsAt);
if (minimalDone) {
  router.replace('/stacks');
} else {
  router.replace('/profile/create');
}
```

For the invite-cookie block, gate the direct redirect on `minimalDone` (else send to `/profile/create?returnTo=...`). Leave the legacy invitation-token block (line 43) keying on `profileCompleted` — it routes to a library welcome and full users are unaffected; a minimal user simply lands on the profile step there, which is acceptable.

> Ensure `/api/profile` GET returns `agreedToTermsAt` — add it to both `select` blocks in `src/app/api/profile/route.ts` GET (the field list around lines 399-418 and 423-442).

- [ ] **Step 3: Typecheck**

Run: `rm -rf .next && npx tsc --noEmit -p tsconfig.json 2>&1 | head`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/stacks/page.tsx src/app/profile/page.tsx src/app/profile/edit/page.tsx src/app/auth/callback/page.tsx src/app/api/profile/route.ts
git commit -m "feat(1c): gate app entry on minimal onboarding, not full profile (#367)"
```

---

## Task 6: Enforce `canLend` on item creation

**Files:**

- Modify: `src/app/api/items/route.ts`, `src/app/api/items/create-draft/route.ts`, `src/app/api/items/create-with-watercolor/route.ts`
- Test: `src/app/api/items/__tests__/route.gating.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/items/__tests__/route.gating.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockGetUserCapabilities = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/user-capabilities', () => ({
  getUserCapabilities: mockGetUserCapabilities,
}));
vi.mock('@/lib/db', () => ({
  db: { item: { create: vi.fn() }, stuffType: {} },
}));

import { POST } from '../route';

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } });
});

it('rejects lending without a full profile (403 + reason)', async () => {
  mockGetUserCapabilities.mockResolvedValue({
    canLend: false,
    reasons: { canLend: 'NEEDS_PHOTO' },
  });
  const res = await POST(
    new Request('http://t/api/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    }) as any
  );
  expect(res.status).toBe(403);
  const json = await res.json();
  expect(json.reason).toBe('NEEDS_PHOTO');
});
```

- [ ] **Step 2: Run, verify failure**

Run: `npx vitest run src/app/api/items/__tests__/route.gating.test.ts`
Expected: FAIL (currently returns 201/200, no gate).

- [ ] **Step 3: Implement the gate**

In each of the three item-creation route handlers, immediately after resolving the authenticated `userId` (and before any creation/validation work), insert:

```ts
import { getUserCapabilities } from '@/lib/user-capabilities';
// ...
const caps = await getUserCapabilities(userId);
if (!caps.canLend) {
  return NextResponse.json(
    {
      error:
        'Complete your profile (photo + verified address) to list an item.',
      reason: caps.reasons.canLend,
    },
    { status: 403 }
  );
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npx vitest run src/app/api/items/__tests__/route.gating.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/items
git commit -m "feat(1c): require full profile to create items (#367)"
```

---

## Task 7: Enforce `canBorrow` + concurrent cap on borrow requests

**Files:**

- Modify: `src/app/api/borrow-requests/route.ts` (after the existing `status: 'active'` borrower check, ~line 189-204)
- Test: `src/app/api/borrow-requests/__tests__/route.gating.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/borrow-requests/__tests__/route.gating.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockGetUserCapabilities = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/user-capabilities', () => ({
  getUserCapabilities: mockGetUserCapabilities,
}));

it('rejects borrow at the concurrent cap (409 + AT_BORROW_LIMIT)', async () => {
  mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } });
  mockGetUserCapabilities.mockResolvedValue({
    canBorrow: false,
    atBorrowLimit: true,
    concurrentBorrowLimit: 2,
    reasons: { canBorrow: 'AT_BORROW_LIMIT' },
  });
  const { POST } = await import('../route');
  const res = await POST(
    new Request('http://t/api/borrow-requests', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ itemId: 'i1' }),
    }) as any
  );
  expect([403, 409]).toContain(res.status);
  const json = await res.json();
  expect(json.reason).toBe('AT_BORROW_LIMIT');
});
```

> Note: the borrow route does heavier work (item lookup, notifications). Mock `@/lib/db` enough for the handler to reach the gate, or place the gate **before** item lookup so the test only needs the capability mock. Prefer gating early (right after `userId` is known).

- [ ] **Step 2: Run, verify failure**

Run: `npx vitest run src/app/api/borrow-requests/__tests__/route.gating.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the gate**

In `src/app/api/borrow-requests/route.ts` POST, right after `userId` is established (before the item/active-borrower queries), add:

```ts
import { getUserCapabilities } from '@/lib/user-capabilities';
// ...
const caps = await getUserCapabilities(userId);
if (!caps.canBorrow) {
  const atLimit = caps.atBorrowLimit;
  return NextResponse.json(
    {
      error: atLimit
        ? `You already have ${caps.concurrentBorrowLimit} active borrows. Return an item before borrowing more.`
        : 'Complete your profile (photo + verified address) to borrow.',
      reason: caps.reasons.canBorrow,
    },
    { status: atLimit ? 409 : 403 }
  );
}
```

Keep the existing `status: 'active'` borrower check as-is (it guards suspension separately).

- [ ] **Step 4: Run, verify pass**

Run: `npx vitest run src/app/api/borrow-requests/__tests__/route.gating.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/borrow-requests
git commit -m "feat(1c): require full profile + enforce concurrent borrow cap (#367)"
```

---

## Task 8: Enforce `canCreateLibrary` on collection creation

**Files:**

- Modify: `src/app/api/collections/route.ts` (POST, ~line 179-190)
- Test: `src/app/api/collections/__tests__/route.gating.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/collections/__tests__/route.gating.test.ts
import { it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockGetUserCapabilities = vi.hoisted(() => vi.fn());
vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/user-capabilities', () => ({
  getUserCapabilities: mockGetUserCapabilities,
}));
vi.mock('@/lib/db', () => ({ db: { collection: { create: vi.fn() } } }));

beforeEach(() => vi.clearAllMocks());

it('rejects creating a library without a full profile (403)', async () => {
  mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } });
  mockGetUserCapabilities.mockResolvedValue({
    canCreateLibrary: false,
    reasons: { canCreateLibrary: 'NEEDS_ADDRESS' },
  });
  const { POST } = await import('../route');
  const res = await POST(
    new Request('http://t/api/collections', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'L' }),
    }) as any
  );
  expect(res.status).toBe(403);
  expect((await res.json()).reason).toBe('NEEDS_ADDRESS');
});
```

- [ ] **Step 2: Run, verify failure**

Run: `npx vitest run src/app/api/collections/__tests__/route.gating.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

In `src/app/api/collections/route.ts` POST, right after the auth check / `userId`:

```ts
import { getUserCapabilities } from '@/lib/user-capabilities';
// ...
const caps = await getUserCapabilities(userId);
if (!caps.canCreateLibrary) {
  return NextResponse.json(
    {
      error:
        'Complete your profile (photo + verified address) to create a library.',
      reason: caps.reasons.canCreateLibrary,
    },
    { status: 403 }
  );
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npx vitest run src/app/api/collections/__tests__/route.gating.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/collections/route.ts src/app/api/collections/__tests__/route.gating.test.ts
git commit -m "feat(1c): require full profile to create a library (#367)"
```

---

## Task 9: Gate non-owner member invites on trust tier

**Files:**

- Modify: `src/app/api/collections/[id]/invite/route.ts`
- Test: `src/app/api/collections/[id]/invite/__tests__/route.gating.test.ts`

The route already loads `library` keyed on owner-or-admin (lines 52-82) and returns 403 when the requester is neither. Today **only** owners/admins pass. New behavior: a non-owner member with `trustTier ≥ TRUSTED` may also invite. Implement by checking membership + capability when the owner/admin lookup misses.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/collections/[id]/invite/__tests__/route.gating.test.ts
import { it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockGetUserCapabilities = vi.hoisted(() => vi.fn());
const mockCollectionFindFirst = vi.hoisted(() => vi.fn());
const mockMemberFindFirst = vi.hoisted(() => vi.fn());
const mockInvitationFindFirst = vi.hoisted(() => vi.fn());
const mockInvitationCount = vi.hoisted(() => vi.fn());
const mockInvitationCreate = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/user-capabilities', () => ({
  getUserCapabilities: mockGetUserCapabilities,
}));
vi.mock('@/lib/db', () => ({
  db: {
    collection: { findFirst: mockCollectionFindFirst },
    collectionMember: { findFirst: mockMemberFindFirst },
    invitation: {
      findFirst: mockInvitationFindFirst,
      count: mockInvitationCount,
      create: mockInvitationCreate,
      update: vi.fn(),
    },
  },
}));

function call(body: unknown) {
  return import('../route').then(({ POST }) =>
    POST(
      new Request('http://t', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }) as any,
      { params: Promise.resolve({ id: 'lib1' }) }
    )
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } });
  mockCollectionFindFirst.mockResolvedValue(null); // not owner/admin
});

it('rejects a non-owner BUILDING member (403 NEEDS_TRUST_TIER)', async () => {
  mockMemberFindFirst.mockResolvedValue({ id: 'm1', isActive: true });
  mockGetUserCapabilities.mockResolvedValue({
    canInvite: false,
    reasons: { canInvite: 'NEEDS_TRUST_TIER' },
  });
  const res = await call({ email: 'x@y.z', mode: 'email' });
  expect(res.status).toBe(403);
  expect((await res.json()).reason).toBe('NEEDS_TRUST_TIER');
});

it('rejects a non-member entirely (403)', async () => {
  mockMemberFindFirst.mockResolvedValue(null);
  const res = await call({ email: 'x@y.z', mode: 'email' });
  expect(res.status).toBe(403);
});
```

- [ ] **Step 2: Run, verify failure**

Run: `npx vitest run "src/app/api/collections/[id]/invite/__tests__/route.gating.test.ts"`
Expected: FAIL (non-owner currently 403 with the generic message, but `reason` is absent; non-owner TRUSTED member is wrongly rejected).

- [ ] **Step 3: Implement**

Replace the `if (!library) { return 403 }` block (lines 77-82) with an owner-or-trusted-member gate:

```ts
if (!library) {
  // Not owner/admin — allow if an active member who has earned invite rights.
  const member = await db.collectionMember.findFirst({
    where: { collectionId: libraryId, userId, isActive: true },
    select: { id: true },
  });
  if (!member) {
    return NextResponse.json(
      { error: 'Library not found or insufficient permissions' },
      { status: 403 }
    );
  }
  const caps = await getUserCapabilities(userId, { libraryId });
  if (!caps.canInvite) {
    return NextResponse.json(
      {
        error:
          'You need to reach the Trusted tier before inviting others to this library.',
        reason: caps.reasons.canInvite,
      },
      { status: 403 }
    );
  }
  // Member is permitted — re-load the collection for the email payload.
  library = await db.collection.findFirst({
    where: { id: libraryId },
    include: { owner: { select: { name: true, email: true } }, _count: true },
  });
  if (!library) {
    return NextResponse.json({ error: 'Library not found' }, { status: 404 });
  }
}
```

Add the import `import { getUserCapabilities } from '@/lib/user-capabilities';` and change `const library = await ...` (line 53) to `let library = await ...` so it can be reassigned.

- [ ] **Step 4: Run, verify pass**

Run: `npx vitest run "src/app/api/collections/[id]/invite/__tests__/route.gating.test.ts"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/collections/[id]/invite"
git commit -m "feat(1c): trusted members may invite; gate non-owner invites on tier (#367)"
```

---

## Task 10: Expose capabilities to the client via the profile GET

**Files:**

- Modify: `src/app/api/profile/route.ts` (GET) — attach a `capabilities` object so client surfaces can render locked states without re-deriving rules.
- Test: extend `src/app/api/profile/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// add to src/app/api/profile/__tests__/route.test.ts
import { GET } from '../route';

it('GET returns a capabilities object', async () => {
  mockGetServerSession.mockResolvedValue({
    user: { id: 'u1', email: 'a@b.c' },
  });
  mockUserFindUnique.mockResolvedValue({
    id: 'u1',
    name: 'Jo',
    agreedToTermsAt: new Date(),
  });
  const res = await GET(new Request('http://t/api/profile') as any);
  const json = await res.json();
  expect(json.capabilities).toBeDefined();
  expect(typeof json.capabilities.canBorrow).toBe('boolean');
});
```

> Mock `@/lib/user-capabilities`'s `getUserCapabilities` in this file to return a fixed `Capabilities` so the GET test is deterministic.

- [ ] **Step 2: Run, verify failure**

Run: `npx vitest run src/app/api/profile/__tests__/route.test.ts`
Expected: FAIL (`capabilities` undefined).

- [ ] **Step 3: Implement**

In the GET handler, after loading `user` and before the final response, compute and attach capabilities:

```ts
import { getUserCapabilities } from '@/lib/user-capabilities';
// ...
const capabilities = await getUserCapabilities(user.id);
return NextResponse.json({ success: true, user, capabilities });
```

- [ ] **Step 4: Run, verify pass**

Run: `npx vitest run src/app/api/profile/__tests__/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/profile/route.ts src/app/api/profile/__tests__/route.test.ts
git commit -m "feat(1c): expose capabilities from profile GET (#367)"
```

---

## Task 11: Split the wizard — minimal-first entry

**Files:**

- Modify: `src/components/ProfileWizard.tsx`, `src/app/profile/create/ProfileCreationHandler.tsx`
- Test: `src/components/__tests__/profile-wizard-steps.test.ts` (pure step-config test)

The wizard currently submits all 3 steps at once and only then sets `profileCompleted`. Restructure so **Step 1 (name + terms)** can submit on its own as the minimal entry, landing the user in `/stacks`; the photo/address/interests steps become an optional "complete your profile" continuation.

To keep this testable, extract the minimal-submit decision into a pure helper and unit-test it; the component wiring stays thin.

- [ ] **Step 1: Write the failing test**

```ts
// src/components/__tests__/profile-wizard-steps.test.ts
import { describe, it, expect } from 'vitest';
import { canSubmitMinimal } from '../profile-wizard/minimalEntry';

describe('canSubmitMinimal', () => {
  it('true with a name and all required agreements', () => {
    expect(
      canSubmitMinimal({
        name: 'Jo',
        agreedToHouseholdGoods: true,
        agreedToTrustAndCare: true,
        agreedToCommunityValues: true,
        agreedToAgeRestrictions: true,
        agreedToTerms: true,
      })
    ).toBe(true);
  });
  it('false when any agreement is unchecked', () => {
    expect(
      canSubmitMinimal({
        name: 'Jo',
        agreedToHouseholdGoods: true,
        agreedToTrustAndCare: true,
        agreedToCommunityValues: true,
        agreedToAgeRestrictions: true,
        agreedToTerms: false,
      })
    ).toBe(false);
  });
  it('false when name is blank', () => {
    expect(
      canSubmitMinimal({
        name: '  ',
        agreedToHouseholdGoods: true,
        agreedToTrustAndCare: true,
        agreedToCommunityValues: true,
        agreedToAgeRestrictions: true,
        agreedToTerms: true,
      })
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `npx vitest run src/components/__tests__/profile-wizard-steps.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the helper + wire it in**

Create `src/components/profile-wizard/minimalEntry.ts`:

```ts
export interface MinimalEntryFields {
  name: string;
  agreedToHouseholdGoods: boolean;
  agreedToTrustAndCare: boolean;
  agreedToCommunityValues: boolean;
  agreedToAgeRestrictions: boolean;
  agreedToTerms: boolean;
}

export function canSubmitMinimal(f: MinimalEntryFields): boolean {
  return Boolean(
    f.name &&
      f.name.trim() &&
      f.agreedToHouseholdGoods &&
      f.agreedToTrustAndCare &&
      f.agreedToCommunityValues &&
      f.agreedToAgeRestrictions &&
      f.agreedToTerms
  );
}
```

Then restructure the wizard step order so the agreements move into Step 1 with name, and add a "Get started" submit on Step 1 that calls `onComplete` with a `mode: 'minimal'` marker. In `ProfileCreationHandler.tsx`, when the wizard reports a minimal submit, POST `{ mode: 'minimal', name, agreedToTerms: true }` to `/api/profile`, clear the draft, and `router.replace('/stacks?welcome=true')`. The existing full-profile submission path stays for users who continue through photo + address (POST without `mode`, i.e. `mode: 'full'`).

> Keep the existing Google Places + photo steps intact; they now render in the "complete profile" continuation reached from Step 1's "Add more later" path and from the JIT prompts (Task 12). Update `steps`/`getFieldsForStep` so Step 1 validates `['name', agreements...]`.

- [ ] **Step 4: Run, verify pass**

Run: `npx vitest run src/components/__tests__/profile-wizard-steps.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/profile-wizard/minimalEntry.ts src/components/__tests__/profile-wizard-steps.test.ts src/components/ProfileWizard.tsx src/app/profile/create/ProfileCreationHandler.tsx
git commit -m "feat(1c): minimal-first wizard entry (name + terms) (#367)"
```

---

## Task 12: Client JIT prompts + locked affordances

**Files:**

- Create: `src/components/CompleteProfilePrompt.tsx` — a reusable dialog driven by a `CapabilityReason`.
- Create: `src/lib/capability-copy.ts` — maps each `CapabilityReason` to user-facing title/body/CTA (pure, testable).
- Test: `src/lib/__tests__/capability-copy.test.ts`
- Modify: the Lend / Borrow / Create-library / member-Invite trigger components to consult `capabilities` (from the profile GET, Task 10) and, when blocked, open the prompt instead of the action.

- [ ] **Step 1: Write the failing test for the copy map**

```ts
// src/lib/__tests__/capability-copy.test.ts
import { describe, it, expect } from 'vitest';
import { capabilityCopy } from '../capability-copy';

describe('capabilityCopy', () => {
  it('covers every reason with a non-empty CTA', () => {
    const reasons = [
      'NEEDS_NAME',
      'NEEDS_TERMS',
      'NEEDS_PHOTO',
      'NEEDS_ADDRESS',
      'NEEDS_TRUST_TIER',
      'AT_BORROW_LIMIT',
    ] as const;
    for (const r of reasons) {
      const c = capabilityCopy(r);
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.cta.length).toBeGreaterThan(0);
    }
  });
  it('routes profile reasons to /profile/create and the trust reason has no profile CTA href', () => {
    expect(capabilityCopy('NEEDS_PHOTO').href).toContain('/profile/create');
    expect(capabilityCopy('NEEDS_TRUST_TIER').href).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `npx vitest run src/lib/__tests__/capability-copy.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement copy map + prompt + wire triggers**

Create `src/lib/capability-copy.ts`:

```ts
import type { CapabilityReason } from './capabilities';

export interface CapabilityCopy {
  title: string;
  body: string;
  cta: string;
  href?: string;
}

const PROFILE_HREF = '/profile/create?continue=1';

export function capabilityCopy(reason: CapabilityReason): CapabilityCopy {
  switch (reason) {
    case 'NEEDS_NAME':
      return {
        title: 'Add your name',
        body: 'Tell us your name to continue.',
        cta: 'Finish profile',
        href: PROFILE_HREF,
      };
    case 'NEEDS_TERMS':
      return {
        title: 'Accept the community terms',
        body: 'Review and accept the terms to continue.',
        cta: 'Review terms',
        href: PROFILE_HREF,
      };
    case 'NEEDS_PHOTO':
      return {
        title: 'Add a profile photo',
        body: 'Neighbors like to know who they are sharing with. Add a photo to lend and borrow.',
        cta: 'Add photo',
        href: PROFILE_HREF,
      };
    case 'NEEDS_ADDRESS':
      return {
        title: 'Verify your address',
        body: 'Verify your address so we can connect you with nearby neighbors before you lend or borrow.',
        cta: 'Verify address',
        href: PROFILE_HREF,
      };
    case 'NEEDS_TRUST_TIER':
      return {
        title: 'Not yet available',
        body: 'You can invite others once you reach the Trusted tier by completing a few successful borrows.',
        cta: 'Got it',
      };
    case 'AT_BORROW_LIMIT':
      return {
        title: 'Borrow limit reached',
        body: 'Return one of your current items before borrowing more. Your limit grows as you build trust.',
        cta: 'Got it',
      };
  }
}
```

Create `src/components/CompleteProfilePrompt.tsx` — an MUI `Dialog` taking `{ reason, open, onClose }`, rendering `capabilityCopy(reason)`, and (if `href`) a `Link` button to it.

Wire the action triggers: the "Add item / Lend", "Request to borrow", "Create library", and member "Invite" buttons read `capabilities` (fetched from `/api/profile` GET, or passed from a server component) and, when the relevant `can*` is false, render disabled + open `CompleteProfilePrompt` with the matching `reasons.*` rather than performing the action. Keep server enforcement (Tasks 6-9) as the authority; this is UX.

- [ ] **Step 4: Run, verify pass**

Run: `npx vitest run src/lib/__tests__/capability-copy.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/capability-copy.ts src/lib/__tests__/capability-copy.test.ts src/components/CompleteProfilePrompt.tsx
git commit -m "feat(1c): just-in-time complete-profile prompts + locked affordances (#367)"
```

---

## Task 13: Full verification + preview

**Files:** none (verification only)

- [ ] **Step 1: Full unit suite**

Run: `npx vitest run`
Expected: green except the 2 known pre-existing watercolor failures (`WatercolorService > renderWatercolor > should handle images with people detected` and `should handle API errors gracefully`). Confirm via `git stash` if anything else fails.

- [ ] **Step 2: Types + lint + build**

Run: `rm -rf .next && npx tsc --noEmit -p tsconfig.json && npx eslint . --max-warnings=99999 && npm run build`
Expected: tsc clean, no new lint errors, build OK.

- [ ] **Step 3: Manual preview (P0-6 staging) checklist**

Push the branch, open the PR ("Closes #367"), and on the Vercel preview verify:

- A brand-new account reaches `/stacks` after submitting only name + terms (not bounced to `/profile/create`).
- That minimal user sees locked Lend/Borrow/Create-library with the complete-profile prompt; completing photo + address unlocks them.
- A full-profile NEW user can borrow up to 2 concurrent, and the 3rd request is rejected with the cap message.
- A non-owner member below TRUSTED cannot invite; the library owner still can.

- [ ] **Step 4: Open the PR**

```bash
git push -u origin phase1c/tiered-onboarding
gh pr create --title "Phase 1C: Tiered onboarding (#367)" --body "Closes #367. See docs/superpowers/specs/2026-06-28-phase-1c-tiered-onboarding-design.md. Verified: unit suite green (2 known watercolor failures pre-existing), tsc/lint/build clean, preview checklist in the plan."
```

---

## Self-Review notes

- **Spec coverage:** capability map → Task 1; terms persistence fix-along → Tasks 2/4; `capabilities.ts` source-of-truth → Tasks 1/3/10; minimal entry + redirect changes → Tasks 4/5/11; server enforcement on items/borrow/collections/invite → Tasks 6/7/8/9; JIT prompts + locked UI + completeness surface → Task 12; testing strategy → every task + Task 13. Null-tier-as-NEW → Task 1 (`?? 'NEW'`) and Task 3. `SignupApplication` left alone (out of scope) — honored.
- **Type consistency:** `CapabilityFacts`/`Capabilities`/`CapabilityReason` defined in Task 1 and reused verbatim in Tasks 3/10/12; `OPEN_BORROW_STATUSES` defined in Task 3 and referenced in its own test; `getUserCapabilities(userId, ctx?)` signature consistent across Tasks 3/6/7/8/9/10; `canSubmitMinimal`/`MinimalEntryFields` Task 11; `capabilityCopy`/`CapabilityReason` Task 12.
- **Known caveat baked in:** `rm -rf .next` before `tsc` after route changes (Tasks 5/13), per infra-gotchas memory.

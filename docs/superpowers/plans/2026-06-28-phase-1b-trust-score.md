# Phase 1B — Trust Score Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the trust score real — a recomputed 0–100 composite (behavior + account standing) cached on the user, recomputed on key events + a daily cron, and surfaced as a tier badge to others / a number to self.

**Architecture:** A pure scoring function + a thin recompute service that caches `trustScore`/`trustTier` on `User`. Borrow/dispute event handlers and a `CRON_SECRET`-gated daily cron call the service. A `TrustBadge` component renders tiers across surfaces. No enforcement.

**Tech Stack:** Next.js App Router, Prisma + Postgres (Supabase), Vitest, Vercel Cron, MUI.

**Spec:** `docs/superpowers/specs/2026-06-28-phase-1b-trust-score-design.md`

---

## File structure

| File                                                                      | Responsibility                                                                       |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `prisma/schema.prisma` (+ migration)                                      | `trustScore` default → 50.0, add `trustTier String?`                                 |
| `src/lib/trust-score.ts`                                                  | pure `computeTrustScore`/`tierForScore` + `recomputeUserTrustScore` service (create) |
| `src/lib/__tests__/trust-score.test.ts`                                   | scoring + service tests (create)                                                     |
| `src/app/api/borrow-requests/[id]/route.ts`                               | call recompute on confirm/check-in + dispute (modify)                                |
| `src/app/api/cron/recompute-trust/route.ts` (+ `__tests__/route.test.ts`) | daily recompute cron (create)                                                        |
| `vercel.json`                                                             | add cron entry (modify)                                                              |
| `src/components/TrustBadge.tsx` (+ `__tests__/TrustBadge.test.tsx`)       | tier → label/color badge (create)                                                    |
| `src/components/lender/BorrowRequestDetail.tsx`                           | show borrower's TrustBadge (modify)                                                  |
| `src/app/api/borrow-requests/[id]/route.ts` (GET include)                 | include `borrower.trustTier` for the badge (modify)                                  |
| `src/components/ProfileView.tsx` + `src/app/api/profile/route.ts`         | self: numeric score + tier + hint (modify)                                           |
| `src/app/api/admin/users/route.ts`                                        | use persisted `trustScore` (modify)                                                  |

Work on branch `phase1b/trust-score`. Pre-req for the migration: local Docker DB (`npm run db:local:start`) or hand-create the migration (fallback shown in Task 1).

---

## Task 1: Schema + migration

**Files:** Modify `prisma/schema.prisma`; create `prisma/migrations/<ts>_phase1b_trust_score/migration.sql`.

- [ ] **Step 1: Edit schema**

In `model User`, change the `trustScore` default and add `trustTier`:

```prisma
  trustScore          Float           @default(50.0)
  trustTier           String?
```

(Leave the other trust fields — `warningCount`, etc. — untouched.)

- [ ] **Step 2: Generate the migration**

Preferred: `npm run db:local:start` then `npx prisma migrate dev --name phase1b_trust_score`.

FALLBACK if Docker/local DB is unavailable: create `prisma/migrations/<TIMESTAMP>_phase1b_trust_score/migration.sql` (TIMESTAMP `YYYYMMDDHHMMSS`, sorting after the latest existing migration) with:

```sql
-- AlterTable
ALTER TABLE "users" ALTER COLUMN "trustScore" SET DEFAULT 50.0;
ALTER TABLE "users" ADD COLUMN "trustTier" TEXT;
```

Verify the table is named `users` (check `@@map` in `model User`) before writing the SQL. Then run `npx prisma generate`.

- [ ] **Step 3: Verify**

Run: `npx prisma generate && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(trust): trustScore 0-100 default + trustTier column (Phase 1B)"
```

---

## Task 2: Pure scoring function

**Files:** Create `src/lib/trust-score.ts`; create `src/lib/__tests__/trust-score.test.ts`.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import {
  computeTrustScore,
  tierForScore,
  type TrustFacts,
} from '../trust-score';

const base: TrustFacts = {
  completedBorrows: 0,
  onTimeReturns: 0,
  lateReturns: 0,
  damagedReturns: 0,
  openDisputes: 0,
  reportsAgainst: 0,
  profileComplete: false,
  emailVerified: false,
  addressVerified: false,
  accountAgeDays: 0,
};

describe('computeTrustScore', () => {
  it('a brand-new bare account scores low-moderate (standing baseline)', () => {
    const s = computeTrustScore(base);
    expect(s).toBeGreaterThanOrEqual(25);
    expect(s).toBeLessThanOrEqual(45);
  });

  it('a complete verified new profile scores higher but not maxed', () => {
    const s = computeTrustScore({
      ...base,
      profileComplete: true,
      emailVerified: true,
      addressVerified: true,
      accountAgeDays: 60,
    });
    expect(s).toBeGreaterThanOrEqual(60);
    expect(s).toBeLessThanOrEqual(80);
  });

  it('an experienced all-on-time borrower scores high', () => {
    const s = computeTrustScore({
      ...base,
      completedBorrows: 10,
      onTimeReturns: 10,
      profileComplete: true,
      emailVerified: true,
      addressVerified: true,
      accountAgeDays: 365,
    });
    expect(s).toBeGreaterThanOrEqual(85);
  });

  it('damage, lateness, disputes, and reports each lower the score', () => {
    const good = {
      ...base,
      completedBorrows: 10,
      onTimeReturns: 10,
      profileComplete: true,
      emailVerified: true,
      addressVerified: true,
      accountAgeDays: 365,
    };
    const g = computeTrustScore(good);
    expect(
      computeTrustScore({ ...good, onTimeReturns: 8, lateReturns: 2 })
    ).toBeLessThan(g);
    expect(computeTrustScore({ ...good, damagedReturns: 2 })).toBeLessThan(g);
    expect(computeTrustScore({ ...good, openDisputes: 1 })).toBeLessThan(g);
    expect(computeTrustScore({ ...good, reportsAgainst: 1 })).toBeLessThan(g);
  });

  it('clamps to 0..100', () => {
    const terrible = {
      ...base,
      completedBorrows: 10,
      onTimeReturns: 0,
      lateReturns: 10,
      damagedReturns: 10,
      openDisputes: 5,
      reportsAgainst: 5,
    };
    const s = computeTrustScore(terrible);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
});

describe('tierForScore', () => {
  it('0 completed borrows is NEW regardless of score', () => {
    expect(tierForScore(95, 0)).toBe('NEW');
  });
  it('maps score bands once there is history', () => {
    expect(tierForScore(50, 3)).toBe('BUILDING');
    expect(tierForScore(70, 3)).toBe('TRUSTED');
    expect(tierForScore(90, 3)).toBe('HIGHLY_TRUSTED');
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/lib/__tests__/trust-score.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `src/lib/trust-score.ts`** (pure parts only for now)

```ts
export type TrustTier = 'NEW' | 'BUILDING' | 'TRUSTED' | 'HIGHLY_TRUSTED';

export interface TrustFacts {
  completedBorrows: number;
  onTimeReturns: number;
  lateReturns: number;
  damagedReturns: number;
  openDisputes: number;
  reportsAgainst: number;
  profileComplete: boolean;
  emailVerified: boolean;
  addressVerified: boolean;
  accountAgeDays: number;
}

// --- Tunable weights (intentionally simple; adjust freely) ---
const STANDING_BASE = 25;
const STANDING_PROFILE = 15;
const STANDING_EMAIL = 10;
const STANDING_ADDRESS = 10;
const STANDING_AGE_MAX = 15;
const STANDING_AGE_DAYS = 60; // days to reach full age credit

const PENALTY_DAMAGED = 15;
const PENALTY_LATE = 10;
const PENALTY_DISPUTE = 20;
const PENALTY_REPORT = 10;
const VOLUME_BONUS_CAP = 10; // +1 per completed borrow, capped

const CONFIDENCE_BORROWS = 5; // borrows to fully trust behavior over standing

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

function accountStanding(f: TrustFacts): number {
  let s = STANDING_BASE;
  if (f.profileComplete) s += STANDING_PROFILE;
  if (f.emailVerified) s += STANDING_EMAIL;
  if (f.addressVerified) s += STANDING_ADDRESS;
  s += Math.min(f.accountAgeDays / STANDING_AGE_DAYS, 1) * STANDING_AGE_MAX;
  return clamp(s);
}

function behaviorScore(f: TrustFacts): number {
  const onTimeRate = (100 * f.onTimeReturns) / Math.max(f.completedBorrows, 1);
  let s = onTimeRate;
  s -= f.damagedReturns * PENALTY_DAMAGED;
  s -= f.lateReturns * PENALTY_LATE;
  s -= f.openDisputes * PENALTY_DISPUTE;
  s -= f.reportsAgainst * PENALTY_REPORT;
  s += Math.min(f.completedBorrows, VOLUME_BONUS_CAP);
  return clamp(s);
}

export function computeTrustScore(f: TrustFacts): number {
  const w = Math.min(f.completedBorrows / CONFIDENCE_BORROWS, 1);
  return Math.round(clamp(behaviorScore(f) * w + accountStanding(f) * (1 - w)));
}

export function tierForScore(
  score: number,
  completedBorrows: number
): TrustTier {
  if (completedBorrows === 0) return 'NEW';
  if (score < 60) return 'BUILDING';
  if (score < 85) return 'TRUSTED';
  return 'HIGHLY_TRUSTED';
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npx vitest run src/lib/__tests__/trust-score.test.ts`
Expected: PASS. If a range assertion is just off, adjust the _weights_ (not the tests' intent) until the representative cases land in their bands.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trust-score.ts src/lib/__tests__/trust-score.test.ts
git commit -m "feat(trust): pure computeTrustScore + tierForScore (Phase 1B)"
```

---

## Task 3: recomputeUserTrustScore service

**Files:** Modify `src/lib/trust-score.ts`; extend `src/lib/__tests__/trust-score.test.ts`.

- [ ] **Step 1: Write the failing test** (mock `@/lib/db`)

Add at the top of the test file (above the existing imports of the pure fns), using `vi.hoisted`:

```ts
import { vi } from 'vitest';
const mockBorrowFindMany = vi.hoisted(() => vi.fn());
const mockDisputeCount = vi.hoisted(() => vi.fn());
const mockReportCount = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({
  db: {
    borrowRequest: { findMany: mockBorrowFindMany },
    dispute: { count: mockDisputeCount },
    userReport: { count: mockReportCount },
    user: { findUnique: mockUserFindUnique, update: mockUserUpdate },
  },
}));
```

Then a test:

```ts
import { recomputeUserTrustScore } from '../trust-score';

describe('recomputeUserTrustScore', () => {
  it('gathers facts and writes trustScore + trustTier', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      profileCompleted: true,
      emailVerified: new Date(),
      createdAt: new Date(Date.now() - 365 * 86400000),
      addresses: [{ verifiedAt: new Date() }],
    });
    mockBorrowFindMany.mockResolvedValue([
      { status: 'RETURNED', returnedLate: false, returnCondition: 'OK' },
      { status: 'RETURNED', returnedLate: false, returnCondition: 'OK' },
      { status: 'RETURNED', returnedLate: true, returnCondition: 'OK' },
      { status: 'ACTIVE', returnedLate: null, returnCondition: null },
    ]);
    mockDisputeCount.mockResolvedValue(0);
    mockReportCount.mockResolvedValue(0);
    mockUserUpdate.mockResolvedValue({});

    await recomputeUserTrustScore('u1');

    expect(mockUserUpdate).toHaveBeenCalledTimes(1);
    const data = mockUserUpdate.mock.calls[0]![0].data;
    expect(typeof data.trustScore).toBe('number');
    expect(['NEW', 'BUILDING', 'TRUSTED', 'HIGHLY_TRUSTED']).toContain(
      data.trustTier
    );
    // 3 completed borrows (2 on-time, 1 late), so not NEW
    expect(data.trustTier).not.toBe('NEW');
  });

  it('never throws if the DB errors', async () => {
    mockUserFindUnique.mockRejectedValueOnce(new Error('db down'));
    await expect(recomputeUserTrustScore('u1')).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/lib/__tests__/trust-score.test.ts -t "recomputeUserTrustScore"`
Expected: FAIL.

- [ ] **Step 3: Implement** — append to `src/lib/trust-score.ts`:

```ts
import { db } from './db';

export async function recomputeUserTrustScore(userId: string): Promise<void> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        profileCompleted: true,
        emailVerified: true,
        createdAt: true,
        addresses: { where: { isActive: true }, select: { verifiedAt: true } },
      },
    });
    if (!user) return;

    const borrows = await db.borrowRequest.findMany({
      where: { borrowerId: userId },
      select: { status: true, returnedLate: true, returnCondition: true },
    });
    const completed = borrows.filter((b) => b.status === 'RETURNED');
    const completedBorrows = completed.length;
    const lateReturns = completed.filter((b) => b.returnedLate === true).length;
    const damagedReturns = completed.filter(
      (b) => b.returnCondition === 'DAMAGED'
    ).length;
    const onTimeReturns = completedBorrows - lateReturns;

    const openDisputes = await db.dispute.count({
      where: {
        status: 'OPEN',
        OR: [{ partyAId: userId }, { partyBId: userId }],
      },
    });
    const reportsAgainst = await db.userReport.count({
      where: { reportedId: userId, status: { in: ['PENDING', 'RESOLVED'] } },
    });

    const facts: TrustFacts = {
      completedBorrows,
      onTimeReturns,
      lateReturns,
      damagedReturns,
      openDisputes,
      reportsAgainst,
      profileComplete: Boolean(user.profileCompleted),
      emailVerified: Boolean(user.emailVerified),
      addressVerified: user.addresses.some((a) => a.verifiedAt != null),
      accountAgeDays: Math.max(
        0,
        (Date.now() - new Date(user.createdAt).getTime()) / 86_400_000
      ),
    };

    const score = computeTrustScore(facts);
    const tier = tierForScore(score, facts.completedBorrows);
    await db.user.update({
      where: { id: userId },
      data: { trustScore: score, trustTier: tier },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('recomputeUserTrustScore failed:', error);
    }
  }
}
```

Note: confirm `ReportStatus` has values `PENDING`/`RESOLVED` (check `enum ReportStatus` in schema); if the names differ, use the actual "counts against the user" statuses. If `UserReport` query shape differs, adapt the `where`.

- [ ] **Step 4: Run to confirm pass**

Run: `npx vitest run src/lib/__tests__/trust-score.test.ts && npx tsc --noEmit && npm run lint`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trust-score.ts src/lib/__tests__/trust-score.test.ts
git commit -m "feat(trust): recomputeUserTrustScore service (Phase 1B)"
```

---

## Task 4: Recompute on key events

**Files:** Modify `src/app/api/borrow-requests/[id]/route.ts`; extend its test.

- [ ] **Step 1: Write the failing test**

In `src/app/api/borrow-requests/[id]/__tests__/route.test.ts`, mock the trust module and assert it's called. Add near the other `vi.mock`s:

```ts
const mockRecompute = vi.hoisted(() => vi.fn());
vi.mock('@/lib/trust-score', () => ({
  recomputeUserTrustScore: mockRecompute,
}));
```

Then a test:

```ts
it('confirm-return recomputes the borrower trust score', async () => {
  mockGetServerSession.mockResolvedValue({ user: { id: 'lender_1' } });
  mockBorrowRequestFindUnique.mockResolvedValue({
    id: 'br_1',
    status: 'RETURN_PENDING',
    borrowerId: 'borrower_1',
    lenderId: 'lender_1',
    itemId: 'item_1',
    requestedReturnDate: new Date(),
    returnedAt: new Date(),
    item: { id: 'item_1', name: 'Drill' },
    borrower: { name: 'B' },
    lender: { name: 'L' },
  });
  mockBorrowRequestUpdate.mockResolvedValue({ id: 'br_1', status: 'RETURNED' });
  await PATCH(makeReq({ action: 'confirm-return', condition: 'OK' }), {
    params: Promise.resolve({ id: 'br_1' }),
  });
  expect(mockRecompute).toHaveBeenCalledWith('borrower_1');
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run "src/app/api/borrow-requests/[id]/__tests__/route.test.ts" -t "recomputes the borrower"`
Expected: FAIL.

- [ ] **Step 3: Implement**

Add the import near the top of `route.ts`:

```ts
import { recomputeUserTrustScore } from '@/lib/trust-score';
```

After the borrow request is updated (right after the `db.borrowRequest.update(...)` call) AND in the `report-problem` and DAMAGED-auto-dispute blocks (after the `db.dispute.create`), recompute the borrower's score without blocking the response:

```ts
// after a successful return confirmation / check-in:
if (action === 'confirm-return' || action === 'lender-return') {
  await recomputeUserTrustScore(borrowRequest.borrowerId);
}
```

For `report-problem` (early-return block) and the DAMAGED auto-dispute block, after creating the dispute add:

```ts
await recomputeUserTrustScore(borrowRequest.borrowerId);
```

`recomputeUserTrustScore` already swallows its own errors, so no extra try/catch is needed, but keep these calls after the primary DB writes so a recompute issue can't affect the main action.

- [ ] **Step 4: Run to confirm pass**

Run: `npx vitest run "src/app/api/borrow-requests/[id]/__tests__/route.test.ts" && npx tsc --noEmit`
Expected: PASS / clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/borrow-requests
git commit -m "feat(trust): recompute borrower score on return/dispute events (Phase 1B)"
```

---

## Task 5: Daily recompute cron

**Files:** Create `src/app/api/cron/recompute-trust/route.ts` + `__tests__/route.test.ts`; modify `vercel.json`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
const mockUserFindMany = vi.hoisted(() => vi.fn());
const mockRecompute = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({ db: { user: { findMany: mockUserFindMany } } }));
vi.mock('@/lib/trust-score', () => ({
  recomputeUserTrustScore: mockRecompute,
}));
import { GET } from '../route';
const req = (auth?: string) =>
  ({ headers: new Headers(auth ? { authorization: auth } : {}) }) as any;

describe('GET /api/cron/recompute-trust', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 's3cret';
    mockUserFindMany.mockResolvedValue([]);
  });
  it('rejects without the cron secret', async () => {
    expect((await GET(req())).status).toBe(401);
  });
  it('recomputes each active user with the secret', async () => {
    mockUserFindMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
    const res = await GET(req('Bearer s3cret'));
    expect(res.status).toBe(200);
    expect(mockRecompute).toHaveBeenCalledTimes(2);
    expect(mockRecompute).toHaveBeenCalledWith('u1');
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run "src/app/api/cron/recompute-trust/__tests__/route.test.ts"`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `src/app/api/cron/recompute-trust/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { recomputeUserTrustScore } from '@/lib/trust-score';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await db.user.findMany({
    where: { status: 'active' },
    select: { id: true },
  });

  for (const u of users) {
    await recomputeUserTrustScore(u.id);
  }

  return NextResponse.json({ processed: users.length });
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npx vitest run "src/app/api/cron/recompute-trust/__tests__/route.test.ts"`
Expected: PASS.

- [ ] **Step 5: Add the cron schedule**

In `vercel.json`, add to the existing `crons` array (read it first; it already has the overdue entry):

```json
{ "path": "/api/cron/recompute-trust", "schedule": "30 16 * * *" }
```

- [ ] **Step 6: Typecheck + commit**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

```bash
git add src/app/api/cron/recompute-trust vercel.json
git commit -m "feat(trust): daily recompute-trust cron (Phase 1B)"
```

---

## Task 6: TrustBadge component

**Files:** Create `src/components/TrustBadge.tsx` + `__tests__/TrustBadge.test.tsx`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrustBadge } from '../TrustBadge';

describe('TrustBadge', () => {
  it('renders a label for each tier', () => {
    const { rerender } = render(<TrustBadge tier="NEW" />);
    expect(screen.getByText('New')).toBeInTheDocument();
    rerender(<TrustBadge tier="HIGHLY_TRUSTED" />);
    expect(screen.getByText('Highly Trusted')).toBeInTheDocument();
  });
  it('renders nothing for a null tier', () => {
    const { container } = render(<TrustBadge tier={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/components/__tests__/TrustBadge.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `src/components/TrustBadge.tsx`**

```tsx
import { Chip } from '@mui/material';

import type { TrustTier } from '@/lib/trust-score';

const TIER_META: Record<
  TrustTier,
  { label: string; color: 'default' | 'info' | 'success' }
> = {
  NEW: { label: 'New', color: 'default' },
  BUILDING: { label: 'Building', color: 'info' },
  TRUSTED: { label: 'Trusted', color: 'success' },
  HIGHLY_TRUSTED: { label: 'Highly Trusted', color: 'success' },
};

export function TrustBadge({
  tier,
  size = 'small',
}: {
  tier: TrustTier | string | null | undefined;
  size?: 'small' | 'medium';
}) {
  if (!tier || !(tier in TIER_META)) return null;
  const meta = TIER_META[tier as TrustTier];
  return (
    <Chip
      label={meta.label}
      color={meta.color}
      size={size}
      variant="outlined"
    />
  );
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npx vitest run src/components/__tests__/TrustBadge.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/TrustBadge.tsx src/components/__tests__/TrustBadge.test.tsx
git commit -m "feat(trust): TrustBadge component (Phase 1B)"
```

---

## Task 7: Show the borrower's badge to the owner

**Files:** Modify `src/app/api/borrow-requests/[id]/route.ts` (GET include) and `src/components/lender/BorrowRequestDetail.tsx`.

- [ ] **Step 1: Ensure the API returns `borrower.trustTier`**

Read the `GET` handler in `route.ts`. Find where the `borrower` relation is selected/included for the response. Add `trustTier: true` (and `trustScore` is not needed for others) to the borrower selection. If the borrower is returned via a broad `include` (all scalars), it's already present — verify and skip.

- [ ] **Step 2: Render the badge**

In `src/components/lender/BorrowRequestDetail.tsx`: read the file, add `trustTier?: string | null` to the borrower shape in its interface, import `TrustBadge`, and render `<TrustBadge tier={request.borrower.trustTier} />` next to the borrower's name where the borrower is displayed.

- [ ] **Step 3: Extend the lender component test**

Add a test rendering a request whose `borrower.trustTier = 'TRUSTED'` and assert "Trusted" appears. Follow the existing test setup in `src/components/lender/__tests__/BorrowRequestDetail.test.tsx`.

- [ ] **Step 4: Verify**

Run: `npx vitest run src/components/lender && npx tsc --noEmit && npm run lint`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/borrow-requests src/components/lender
git commit -m "feat(trust): show borrower trust tier to owner (Phase 1B)"
```

---

## Task 8: Self — numeric score + tier + hint

**Files:** Modify `src/app/api/profile/route.ts` (GET returns score/tier) and `src/components/ProfileView.tsx`.

- [ ] **Step 1: Ensure the profile API returns score + tier**

Read `src/app/api/profile/route.ts` GET. Ensure the returned user includes `trustScore` and `trustTier` (add to the select/return if a `select` is used; if it returns the full user, verify they're present).

- [ ] **Step 2: Render on the profile**

In `src/components/ProfileView.tsx` (the user's own profile view): read the file, import `TrustBadge`, and add a small "Trust" section showing the numeric `trustScore`, the `TrustBadge` for `trustTier`, and a static hint: "Complete your profile and return items on time to raise your score." Follow the component's existing section/card style.

- [ ] **Step 3: Test**

If `ProfileView` has a test, extend it to assert the score number + a hint render when `trustScore`/`trustTier` are provided. If it has no test and is awkward to render in isolation, add a minimal render test following the pattern in `src/components/borrower/__tests__/BorrowRequestDetail.test.tsx`. (If genuinely impractical, note it and rely on the typecheck — but prefer a test.)

- [ ] **Step 4: Verify**

Run: `npx vitest run src/components && npx tsc --noEmit && npm run lint`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/profile src/components/ProfileView.tsx
git commit -m "feat(trust): show own score + tier + hint on profile (Phase 1B)"
```

---

## Task 9: Admin uses the persisted score

**Files:** Modify `src/app/api/admin/users/route.ts`.

- [ ] **Step 1: Replace the synthetic calc**

Read lines ~120-135. Replace the synthetic `trustScore = profileScore + phoneScore + itemsScore + activityScore` with the persisted value: `const trustScore = user.trustScore;` (ensure `trustScore` and `trustTier` are selected on the user query). Keep the rest of the response shape. Remove now-unused `profileScore`/`phoneScore`/`itemsScore`/`activityScore` locals if they become dead.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean (no unused-var lint errors). If there's an existing admin/users test, run it: `npx vitest run src/app/api/admin`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/users/route.ts
git commit -m "feat(trust): admin shows persisted trust score (Phase 1B)"
```

---

## Task 10: Full verification + PR

- [ ] **Step 1: Full suite** — `npx vitest run` → all green except the 2 known pre-existing `WatercolorService` failures.
- [ ] **Step 2: Typecheck + lint** — `npx tsc --noEmit && npm run lint` → clean, 0 lint errors.
- [ ] **Step 3: Build** — `SKIP_ENV_VALIDATION=1 npx next build` → compiles; `/api/cron/recompute-trust` appears as a route.
- [ ] **Step 4: Push + PR**

```bash
git push -u origin phase1b/trust-score
gh pr create --base main --title "Phase 1B: Real trust score (#363)" --body "Implements docs/superpowers/specs/2026-06-28-phase-1b-trust-score-design.md. Closes #363."
```

- [ ] **Step 5: Verify on the preview deploy** — confirm the migration applies to staging; spot-check that a returned borrow updates the borrower's score and the badge renders.

---

## Notes for the implementer

- `recomputeUserTrustScore` swallows its own errors by design — trust updates must never break a borrow action or a request.
- Keep the scoring weights as named constants; tuning is expected. Tests assert _bands/orderings_, not brittle exact values.
- The first production daily cron run backfills all existing users off the old default; `CRON_SECRET` is already set in prod.
- Don't build enforcement, report-submission UI, or touch `trust-safety.ts` — out of scope.

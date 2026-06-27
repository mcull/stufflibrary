# Phase 1A — Damage / Return Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture item condition and damage at return, add an explicit `RETURN_PENDING` confirmation step, and send overdue reminders — producing clean trust signals for Phase 1B.

**Architecture:** Extend the `BorrowRequest` lifecycle with a `RETURN_PENDING` state and owner-assessed condition fields; reported problems create `Dispute` rows; a `CRON_SECRET`-guarded daily route sends due/overdue reminders driven by a pure, unit-tested selection function.

**Tech Stack:** Next.js App Router (route handlers), Prisma + Postgres (Supabase), Vitest, Vercel Cron.

**Spec:** `docs/superpowers/specs/2026-06-27-phase-1a-damage-return-path-design.md`

---

## File structure

| File                                                         | Responsibility                                 |
| ------------------------------------------------------------ | ---------------------------------------------- |
| `prisma/schema.prisma`                                       | New enum values/fields (modify)                |
| `prisma/migrations/<ts>_phase1a_return_damage/migration.sql` | Generated migration (create)                   |
| `src/lib/borrow-request-utils.ts`                            | Item availability on RETURN_PENDING (modify)   |
| `src/app/api/borrow-requests/[id]/route.ts`                  | Return state machine + report-problem (modify) |
| `src/app/api/borrow-requests/[id]/__tests__/route.test.ts`   | API transition tests (modify)                  |
| `src/lib/overdue.ts`                                         | Pure `selectOverdueReminders()` (create)       |
| `src/lib/__tests__/overdue.test.ts`                          | Overdue logic tests (create)                   |
| `src/app/api/cron/overdue/route.ts`                          | Cron route (create)                            |
| `src/app/api/cron/overdue/__tests__/route.test.ts`           | Cron auth/flow test (create)                   |
| `src/lib/notification-service.ts`                            | `PROBLEM_REPORTED` handling (modify)           |
| `vercel.json`                                                | `crons` entry (modify)                         |
| `.env.example`                                               | `CRON_SECRET` (modify)                         |
| `src/components/borrower/BorrowRequestDetail.tsx`            | Return note + awaiting state (modify)          |
| `src/components/lender/BorrowRequestDetail.tsx`              | Condition selector + report-problem (modify)   |
| `src/components/lender/LenderRequestsPage.tsx`               | "To confirm" surface + badge (modify)          |
| `src/components/VintageCheckoutCard.tsx`                     | `RETURN_PENDING` badge (modify)                |

**Pre-req:** a local Postgres for `prisma migrate dev` (`npm run db:local:start`), or generate the migration against the staging DB. Work on branch `phase1a/damage-return-path`.

---

## Task 1: Schema + migration

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<ts>_phase1a_return_damage/migration.sql` (generated)

- [ ] **Step 1: Add the enum values and fields to `prisma/schema.prisma`**

In `enum BorrowRequestStatus`, add `RETURN_PENDING` between `ACTIVE` and `RETURNED`:

```prisma
enum BorrowRequestStatus {
  PENDING
  APPROVED
  DECLINED
  ACTIVE
  RETURN_PENDING
  RETURNED
  CANCELLED
}
```

Add a new enum near the other enums:

```prisma
enum ReturnCondition {
  OK
  MINOR_WEAR
  DAMAGED
}
```

In `enum NotificationType`, add a value:

```prisma
  PROBLEM_REPORTED   // a problem/damage was reported on a borrow
```

In `model BorrowRequest`, add these fields (after `returnedAt`):

```prisma
  returnCondition       ReturnCondition?
  returnConditionNote   String?
  returnPhotoUrl        String?
  returnConfirmedAt     DateTime?
  returnConfirmedBy     String?
  returnedLate          Boolean?
  borrowerReturnNote    String?
  lastOverdueReminderAt DateTime?
  cancelledAt           DateTime?
  cancellationReason    String?
  cancelledBy           String?
```

- [ ] **Step 2: Start the local DB (if not already running)**

Run: `npm run db:local:start`
Expected: docker postgres container up.

- [ ] **Step 3: Generate + apply the migration**

Run: `npx prisma migrate dev --name phase1a_return_damage`
Expected: a new folder under `prisma/migrations/` and "Your database is now in sync". Prisma emits the `ALTER TYPE ... ADD VALUE` statements outside a transaction automatically.

- [ ] **Step 4: Verify the client typechecks the new fields**

Run: `npx tsc --noEmit`
Expected: PASS (no errors from referencing the new fields/enum — there are none yet, so this just confirms generation succeeded).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(borrow): schema for return condition, RETURN_PENDING, overdue (Phase 1A)"
```

---

## Task 2: `return` → RETURN_PENDING

**Files:**

- Modify: `src/app/api/borrow-requests/[id]/route.ts` (the `case 'return'` block + the allowed-actions list + availability call)
- Test: `src/app/api/borrow-requests/[id]/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing test**

Add to the route test file (follow the file's existing mocking setup for `db`, `getServerSession`):

```ts
it("borrower 'return' moves ACTIVE -> RETURN_PENDING and stores the note", async () => {
  mockGetServerSession.mockResolvedValue({ user: { id: 'borrower_1' } });
  mockBorrowRequestFindUnique.mockResolvedValue({
    id: 'br_1',
    status: 'ACTIVE',
    borrowerId: 'borrower_1',
    lenderId: 'lender_1',
    itemId: 'item_1',
  });
  mockBorrowRequestUpdate.mockResolvedValue({
    id: 'br_1',
    status: 'RETURN_PENDING',
  });

  const res = await PATCH(
    makeReq({ action: 'return', message: 'left on porch' }),
    {
      params: Promise.resolve({ id: 'br_1' }),
    }
  );

  expect(res.status).toBe(200);
  const data = mockBorrowRequestUpdate.mock.calls[0]![0].data;
  expect(data.status).toBe('RETURN_PENDING');
  expect(data.borrowerReturnNote).toBe('left on porch');
});
```

(If helpers like `makeReq`, `mockBorrowRequestUpdate` don't exist, add them mirroring the file's existing patterns.)

- [ ] **Step 2: Run it to confirm failure**

Run: `npx vitest run "src/app/api/borrow-requests/[id]/__tests__/route.test.ts" -t "RETURN_PENDING"`
Expected: FAIL (status still becomes `RETURNED`, no `borrowerReturnNote`).

- [ ] **Step 3: Implement**

In `route.ts`, add `'report-problem'` is NOT needed here. Update the allowed-actions array (around line 162) to include the new state implicitly (no change needed to the list for `return`). Replace the `case 'return':` block body (lines ~253-279) with:

```ts
      case 'return':
        if (borrowRequest.borrowerId !== userId) {
          return NextResponse.json(
            { error: 'Only the borrower can mark items as returned' },
            { status: 403 }
          );
        }
        if (borrowRequest.status !== 'ACTIVE') {
          return NextResponse.json(
            { error: 'Can only return items that are currently active' },
            { status: 400 }
          );
        }
        authorizedUser = true;
        newStatus = 'RETURN_PENDING';
        updateData = {
          status: newStatus,
          returnedAt: actualReturnDate ? new Date(actualReturnDate) : new Date(),
          borrowerReturnNote: message || null,
        };
        break;
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run "src/app/api/borrow-requests/[id]/__tests__/route.test.ts" -t "RETURN_PENDING"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/borrow-requests
git commit -m "feat(borrow): borrower return moves to RETURN_PENDING (Phase 1A)"
```

---

## Task 3: `confirm-return` captures condition → RETURNED

**Files:**

- Modify: `src/app/api/borrow-requests/[id]/route.ts` (`case 'confirm-return'`, request body parse)
- Test: same route test

- [ ] **Step 1: Write the failing tests**

```ts
it("'confirm-return' requires a condition", async () => {
  mockGetServerSession.mockResolvedValue({ user: { id: 'lender_1' } });
  mockBorrowRequestFindUnique.mockResolvedValue({
    id: 'br_1',
    status: 'RETURN_PENDING',
    borrowerId: 'borrower_1',
    lenderId: 'lender_1',
    itemId: 'item_1',
    requestedReturnDate: new Date('2026-06-01'),
    returnedAt: new Date('2026-06-05'),
  });
  const res = await PATCH(makeReq({ action: 'confirm-return' }), {
    params: Promise.resolve({ id: 'br_1' }),
  });
  expect(res.status).toBe(400);
});

it("'confirm-return' with condition moves RETURN_PENDING -> RETURNED and flags late", async () => {
  mockGetServerSession.mockResolvedValue({ user: { id: 'lender_1' } });
  mockBorrowRequestFindUnique.mockResolvedValue({
    id: 'br_1',
    status: 'RETURN_PENDING',
    borrowerId: 'borrower_1',
    lenderId: 'lender_1',
    itemId: 'item_1',
    requestedReturnDate: new Date('2026-06-01'),
    returnedAt: new Date('2026-06-05'),
  });
  mockBorrowRequestUpdate.mockResolvedValue({ id: 'br_1', status: 'RETURNED' });

  const res = await PATCH(
    makeReq({ action: 'confirm-return', condition: 'OK' }),
    { params: Promise.resolve({ id: 'br_1' }) }
  );
  expect(res.status).toBe(200);
  const data = mockBorrowRequestUpdate.mock.calls[0]![0].data;
  expect(data.status).toBe('RETURNED');
  expect(data.returnCondition).toBe('OK');
  expect(data.returnedLate).toBe(true);
  expect(data.returnConfirmedBy).toBe('lender_1');
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run "src/app/api/borrow-requests/[id]/__tests__/route.test.ts" -t "confirm-return"`
Expected: FAIL.

- [ ] **Step 3: Implement**

Extend the body parse (line ~121) to read the new inputs:

```ts
const {
  action,
  message,
  actualReturnDate,
  condition,
  conditionNote,
  photoUrl,
} = body;
```

Add a shared helper near the top of the file (module scope):

```ts
const VALID_CONDITIONS = ['OK', 'MINOR_WEAR', 'DAMAGED'] as const;
type ConditionInput = (typeof VALID_CONDITIONS)[number];
function computeReturnedLate(
  requestedReturnDate: Date,
  returnedAt: Date | null
): boolean {
  const back = returnedAt ?? new Date();
  return back.getTime() > new Date(requestedReturnDate).getTime();
}
```

Replace the `case 'confirm-return':` block (lines ~316-344) with:

```ts
      case 'confirm-return':
        if (borrowRequest.lenderId !== userId) {
          return NextResponse.json(
            { error: 'Only the item owner can confirm returns' },
            { status: 403 }
          );
        }
        if (borrowRequest.status !== 'RETURN_PENDING') {
          return NextResponse.json(
            { error: 'Can only confirm items awaiting return confirmation' },
            { status: 400 }
          );
        }
        if (!condition || !VALID_CONDITIONS.includes(condition as ConditionInput)) {
          return NextResponse.json(
            { error: 'A return condition (OK, MINOR_WEAR, DAMAGED) is required' },
            { status: 400 }
          );
        }
        authorizedUser = true;
        newStatus = 'RETURNED';
        updateData = {
          status: newStatus,
          returnCondition: condition,
          returnConditionNote: conditionNote || null,
          returnPhotoUrl: photoUrl || null,
          returnConfirmedAt: new Date(),
          returnConfirmedBy: userId,
          returnedLate: computeReturnedLate(
            borrowRequest.requestedReturnDate,
            borrowRequest.returnedAt
          ),
          lenderMessage: message || 'Return confirmed by lender',
        };
        break;
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run "src/app/api/borrow-requests/[id]/__tests__/route.test.ts" -t "confirm-return"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/borrow-requests
git commit -m "feat(borrow): confirm-return captures condition and late flag (Phase 1A)"
```

---

## Task 4: `lender-return` captures condition

**Files:**

- Modify: `src/app/api/borrow-requests/[id]/route.ts` (`case 'lender-return'`)
- Test: same route test

- [ ] **Step 1: Write the failing test**

```ts
it("'lender-return' check-in requires + records condition, goes to RETURNED", async () => {
  mockGetServerSession.mockResolvedValue({ user: { id: 'lender_1' } });
  mockBorrowRequestFindUnique.mockResolvedValue({
    id: 'br_1',
    status: 'ACTIVE',
    borrowerId: 'borrower_1',
    lenderId: 'lender_1',
    itemId: 'item_1',
    requestedReturnDate: new Date('2026-12-01'),
    returnedAt: null,
  });
  mockBorrowRequestUpdate.mockResolvedValue({ id: 'br_1', status: 'RETURNED' });
  const res = await PATCH(
    makeReq({ action: 'lender-return', condition: 'MINOR_WEAR' }),
    { params: Promise.resolve({ id: 'br_1' }) }
  );
  expect(res.status).toBe(200);
  const data = mockBorrowRequestUpdate.mock.calls[0]![0].data;
  expect(data.status).toBe('RETURNED');
  expect(data.returnCondition).toBe('MINOR_WEAR');
  expect(data.returnConfirmedBy).toBe('lender_1');
  expect(data.returnedLate).toBe(false);
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run "src/app/api/borrow-requests/[id]/__tests__/route.test.ts" -t "lender-return"`
Expected: FAIL.

- [ ] **Step 3: Implement**

Replace the `case 'lender-return':` block (lines ~346-375) with:

```ts
      case 'lender-return':
        if (borrowRequest.lenderId !== userId) {
          return NextResponse.json(
            { error: 'Only the item owner can check in items' },
            { status: 403 }
          );
        }
        if (!['ACTIVE', 'APPROVED'].includes(borrowRequest.status)) {
          return NextResponse.json(
            { error: 'Can only check in items that are currently active or approved' },
            { status: 400 }
          );
        }
        if (!condition || !VALID_CONDITIONS.includes(condition as ConditionInput)) {
          return NextResponse.json(
            { error: 'A return condition (OK, MINOR_WEAR, DAMAGED) is required' },
            { status: 400 }
          );
        }
        authorizedUser = true;
        newStatus = 'RETURNED';
        {
          const back = actualReturnDate ? new Date(actualReturnDate) : new Date();
          updateData = {
            status: newStatus,
            returnedAt: back,
            returnCondition: condition,
            returnConditionNote: conditionNote || null,
            returnPhotoUrl: photoUrl || null,
            returnConfirmedAt: new Date(),
            returnConfirmedBy: userId,
            returnedLate: computeReturnedLate(borrowRequest.requestedReturnDate, back),
            lenderMessage: message || 'Item checked in by owner',
          };
        }
        break;
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run "src/app/api/borrow-requests/[id]/__tests__/route.test.ts" -t "lender-return"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/borrow-requests
git commit -m "feat(borrow): lender check-in captures condition (Phase 1A)"
```

---

## Task 5: `report-problem` action → creates a Dispute

**Files:**

- Modify: `src/app/api/borrow-requests/[id]/route.ts` (allowed-actions list + new `case 'report-problem'`)
- Test: same route test

- [ ] **Step 1: Write the failing tests**

```ts
it("'report-problem' creates an OPEN Dispute and notifies (within window)", async () => {
  mockGetServerSession.mockResolvedValue({ user: { id: 'lender_1' } });
  mockBorrowRequestFindUnique.mockResolvedValue({
    id: 'br_1',
    status: 'RETURNED',
    borrowerId: 'borrower_1',
    lenderId: 'lender_1',
    itemId: 'item_1',
    returnedAt: new Date(),
    requestedReturnDate: new Date(),
  });
  mockDisputeCreate.mockResolvedValue({ id: 'd_1' });
  const res = await PATCH(
    makeReq({
      action: 'report-problem',
      disputeType: 'ITEM_DAMAGED',
      title: 'Cracked',
      message: 'Big crack',
    }),
    { params: Promise.resolve({ id: 'br_1' }) }
  );
  expect(res.status).toBe(200);
  const data = mockDisputeCreate.mock.calls[0]![0].data;
  expect(data).toMatchObject({
    type: 'ITEM_DAMAGED',
    status: 'OPEN',
    partyAId: 'lender_1',
    partyBId: 'borrower_1',
    borrowRequestId: 'br_1',
    itemId: 'item_1',
  });
});

it("'report-problem' rejected outside the 7-day window", async () => {
  mockGetServerSession.mockResolvedValue({ user: { id: 'lender_1' } });
  const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
  mockBorrowRequestFindUnique.mockResolvedValue({
    id: 'br_1',
    status: 'RETURNED',
    borrowerId: 'borrower_1',
    lenderId: 'lender_1',
    itemId: 'item_1',
    returnedAt: old,
    requestedReturnDate: old,
  });
  const res = await PATCH(
    makeReq({
      action: 'report-problem',
      disputeType: 'ITEM_DAMAGED',
      title: 'x',
      message: 'y',
    }),
    { params: Promise.resolve({ id: 'br_1' }) }
  );
  expect(res.status).toBe(400);
});
```

Ensure the test mocks include `db.dispute.create` as `mockDisputeCreate`.

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run "src/app/api/borrow-requests/[id]/__tests__/route.test.ts" -t "report-problem"`
Expected: FAIL.

- [ ] **Step 3: Implement**

Add `'report-problem'` to the allowed-actions array (line ~162). Add this case (a Dispute create, not a status change — so handle it before the generic update or as its own early return). Insert near the other cases, but because it does NOT change `BorrowRequest.status`, give it an early return after creating the dispute:

```ts
      case 'report-problem': {
        const isParty =
          borrowRequest.borrowerId === userId || borrowRequest.lenderId === userId;
        if (!isParty) {
          return NextResponse.json(
            { error: 'Only the borrower or owner can report a problem' },
            { status: 403 }
          );
        }
        if (!['RETURN_PENDING', 'RETURNED'].includes(borrowRequest.status)) {
          return NextResponse.json(
            { error: 'Problems can only be reported on a returned borrow' },
            { status: 400 }
          );
        }
        const reference = borrowRequest.returnedAt ?? new Date();
        const ageMs = Date.now() - new Date(reference).getTime();
        if (ageMs > 7 * 24 * 60 * 60 * 1000) {
          return NextResponse.json(
            { error: 'The 7-day window to report a problem has passed' },
            { status: 400 }
          );
        }
        const validTypes = ['ITEM_DAMAGED', 'ITEM_NOT_RETURNED', 'ITEM_NOT_AS_DESCRIBED', 'OTHER'];
        const disputeType = validTypes.includes(body.disputeType) ? body.disputeType : 'OTHER';
        const otherPartyId =
          borrowRequest.borrowerId === userId ? borrowRequest.lenderId : borrowRequest.borrowerId;

        await db.dispute.create({
          data: {
            type: disputeType,
            status: 'OPEN',
            title: (body.title as string) || 'Reported problem',
            description: (message as string) || '',
            partyAId: userId,
            partyBId: otherPartyId,
            itemId: borrowRequest.itemId,
            borrowRequestId: borrowRequest.id,
          },
        });

        await createNotification({
          userId: otherPartyId,
          type: 'PROBLEM_REPORTED',
          title: 'A problem was reported',
          message: `A problem was reported on a borrow: ${(body.title as string) || disputeType}`,
        });

        return NextResponse.json({ success: true });
      }
```

Add the import if missing: `import { createNotification } from '@/lib/notification-service';` (check the file's existing imports first).

- [ ] **Step 4: Run the tests**

Run: `npx vitest run "src/app/api/borrow-requests/[id]/__tests__/route.test.ts" -t "report-problem"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/borrow-requests
git commit -m "feat(borrow): report-problem creates a Dispute (Phase 1A)"
```

---

## Task 6: Item availability on RETURN_PENDING

**Files:**

- Modify: `src/lib/borrow-request-utils.ts` (`updateItemAvailability` — treat RETURN_PENDING as "item back")
- Test: `src/lib/__tests__/borrow-request-utils.test.ts` (the existing file gates on `DATABASE_URL`; add a focused unit test if the function is pure enough, otherwise assert the status set used)

- [ ] **Step 1: Read the function**

Run: `grep -n "RETURNED\|CANCELLED\|currentBorrowRequestId\|updateItemAvailability" src/lib/borrow-request-utils.ts`
Confirm where statuses that free the item are listed.

- [ ] **Step 2: Write/extend the failing test**

If `updateItemAvailability` branches on a status set, add a test asserting `RETURN_PENDING` frees the item (mirror existing test style in that file). If the existing tests are DB-gated, instead extract the "is the item free for this status" decision into a small pure helper `statusFreesItem(status)` and test that:

```ts
import { statusFreesItem } from '../borrow-request-utils';
it('RETURN_PENDING frees the item', () => {
  expect(statusFreesItem('RETURN_PENDING')).toBe(true);
  expect(statusFreesItem('ACTIVE')).toBe(false);
});
```

- [ ] **Step 3: Run to confirm failure**

Run: `npx vitest run src/lib/__tests__/borrow-request-utils.test.ts -t "frees the item"`
Expected: FAIL.

- [ ] **Step 4: Implement**

Add/extend the helper so the freeing set is `['RETURNED', 'CANCELLED', 'DECLINED', 'RETURN_PENDING']`, and use it inside `updateItemAvailability` to decide whether to clear `currentBorrowRequestId`.

- [ ] **Step 5: Run the test**

Run: `npx vitest run src/lib/__tests__/borrow-request-utils.test.ts -t "frees the item"`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/borrow-request-utils.ts src/lib/__tests__/borrow-request-utils.test.ts
git commit -m "feat(borrow): item becomes available at RETURN_PENDING (Phase 1A)"
```

---

## Task 7: PROBLEM_REPORTED notification wiring

**Files:**

- Modify: `src/lib/notification-service.ts` (ensure `PROBLEM_REPORTED` is handled in any type→label/email mapping)
- Modify: `src/lib/email-templates.ts` (add a simple problem-reported email if the service sends email per type)
- Test: `src/lib/__tests__/notification-service.test.ts`

- [ ] **Step 1: Inspect how `createNotification` maps types**

Run: `sed -n '28,120p' src/lib/notification-service.ts`
Identify whether there's a `switch(type)` / map that must include the new type (label, icon, email). If it's generic (stores type + title + message), no mapping change is needed — confirm and skip email.

- [ ] **Step 2: Write the failing test (only if a mapping exists)**

```ts
it('handles PROBLEM_REPORTED without throwing and persists it', async () => {
  mockNotificationCreate.mockResolvedValue({ id: 'n1' });
  await createNotification({
    userId: 'u1',
    type: 'PROBLEM_REPORTED',
    title: 't',
    message: 'm',
  });
  expect(mockNotificationCreate).toHaveBeenCalled();
  const data = mockNotificationCreate.mock.calls[0]![0].data;
  expect(data.type).toBe('PROBLEM_REPORTED');
});
```

- [ ] **Step 3: Run to confirm failure / no-op**

Run: `npx vitest run src/lib/__tests__/notification-service.test.ts -t "PROBLEM_REPORTED"`
Expected: FAIL if a `switch` lacks the case; PASS immediately if generic (then this task is just verification).

- [ ] **Step 4: Implement**

Add the `PROBLEM_REPORTED` case to whatever mapping exists (label e.g. "Problem reported"; reuse a neutral icon). If emails are per-type, add a minimal template in `email-templates.ts` mirroring an existing one.

- [ ] **Step 5: Run the test + typecheck**

Run: `npx vitest run src/lib/__tests__/notification-service.test.ts -t "PROBLEM_REPORTED" && npx tsc --noEmit`
Expected: PASS / clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/notification-service.ts src/lib/email-templates.ts src/lib/__tests__/notification-service.test.ts
git commit -m "feat(notify): PROBLEM_REPORTED notification type (Phase 1A)"
```

---

## Task 8: Overdue selection (pure function)

**Files:**

- Create: `src/lib/overdue.ts`
- Test: `src/lib/__tests__/overdue.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { selectOverdueReminders } from '../overdue';

const NOW = Date.parse('2026-06-27T12:00:00Z');
const base = {
  id: 'b',
  status: 'ACTIVE',
  lastOverdueReminderAt: null as Date | null,
};

describe('selectOverdueReminders', () => {
  it('flags due-tomorrow (~24h out)', () => {
    const r = selectOverdueReminders(
      [{ ...base, requestedReturnDate: new Date('2026-06-28T10:00:00Z') }],
      NOW
    );
    expect(r[0]!.kind).toBe('DUE_TOMORROW');
  });
  it('flags overdue (past due)', () => {
    const r = selectOverdueReminders(
      [{ ...base, requestedReturnDate: new Date('2026-06-25T10:00:00Z') }],
      NOW
    );
    expect(r[0]!.kind).toBe('OVERDUE');
  });
  it('skips when reminded within last 24h', () => {
    const r = selectOverdueReminders(
      [
        {
          ...base,
          requestedReturnDate: new Date('2026-06-25T10:00:00Z'),
          lastOverdueReminderAt: new Date('2026-06-27T06:00:00Z'),
        },
      ],
      NOW
    );
    expect(r).toEqual([]);
  });
  it('ignores non-ACTIVE and far-future borrows', () => {
    const r = selectOverdueReminders(
      [
        {
          ...base,
          status: 'RETURNED',
          requestedReturnDate: new Date('2026-06-25T10:00:00Z'),
        },
        { ...base, requestedReturnDate: new Date('2026-07-30T10:00:00Z') },
      ],
      NOW
    );
    expect(r).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/lib/__tests__/overdue.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `src/lib/overdue.ts`**

```ts
export interface OverdueCandidate {
  id: string;
  status: string;
  requestedReturnDate: Date | string;
  lastOverdueReminderAt: Date | string | null;
}
export type ReminderKind = 'DUE_TOMORROW' | 'OVERDUE';
export interface Reminder {
  id: string;
  kind: ReminderKind;
}

const DAY = 24 * 60 * 60 * 1000;

export function selectOverdueReminders(
  borrows: OverdueCandidate[],
  now: number
): Reminder[] {
  const out: Reminder[] = [];
  for (const b of borrows) {
    if (b.status !== 'ACTIVE') continue;
    const due = new Date(b.requestedReturnDate).getTime();
    const last = b.lastOverdueReminderAt
      ? new Date(b.lastOverdueReminderAt).getTime()
      : null;
    if (last !== null && now - last < DAY) continue; // throttle

    if (due < now) {
      out.push({ id: b.id, kind: 'OVERDUE' });
    } else if (due - now <= DAY) {
      out.push({ id: b.id, kind: 'DUE_TOMORROW' });
    }
  }
  return out;
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/lib/__tests__/overdue.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/overdue.ts src/lib/__tests__/overdue.test.ts
git commit -m "feat(overdue): pure selectOverdueReminders (Phase 1A)"
```

---

## Task 9: Overdue cron route

**Files:**

- Create: `src/app/api/cron/overdue/route.ts`
- Test: `src/app/api/cron/overdue/__tests__/route.test.ts`
- Modify: `vercel.json`, `.env.example`

- [ ] **Step 1: Write the failing test (auth gate)**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
const mockFindMany = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockCreateNotification = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({
  db: { borrowRequest: { findMany: mockFindMany, update: mockUpdate } },
}));
vi.mock('@/lib/notification-service', () => ({
  createNotification: mockCreateNotification,
}));
import { GET } from '../route';

function req(auth?: string) {
  return { headers: new Headers(auth ? { authorization: auth } : {}) } as any;
}

describe('GET /api/cron/overdue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 's3cret';
    mockFindMany.mockResolvedValue([]);
  });
  it('rejects without the cron secret', async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
  });
  it('runs and reports a count with the secret', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'b1',
        status: 'ACTIVE',
        borrowerId: 'u1',
        lenderId: 'u2',
        itemId: 'i1',
        requestedReturnDate: new Date(Date.now() - 86400000),
        lastOverdueReminderAt: null,
        item: { name: 'Drill' },
      },
    ]);
    const res = await GET(req('Bearer s3cret'));
    expect(res.status).toBe(200);
    expect(mockCreateNotification).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalled(); // persists lastOverdueReminderAt
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/app/api/cron/overdue/__tests__/route.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `src/app/api/cron/overdue/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { createNotification } from '@/lib/notification-service';
import { selectOverdueReminders } from '@/lib/overdue';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const active = await db.borrowRequest.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      status: true,
      borrowerId: true,
      lenderId: true,
      requestedReturnDate: true,
      lastOverdueReminderAt: true,
      item: { select: { name: true } },
    },
  });

  const reminders = selectOverdueReminders(active, Date.now());
  const byId = new Map(active.map((b) => [b.id, b]));

  for (const r of reminders) {
    const b = byId.get(r.id);
    if (!b) continue;
    const itemName = b.item?.name ?? 'an item';
    const overdue = r.kind === 'OVERDUE';
    await createNotification({
      userId: b.borrowerId,
      type: overdue ? 'ITEM_OVERDUE' : 'ITEM_DUE_TOMORROW',
      title: overdue ? 'Item overdue' : 'Item due tomorrow',
      message: overdue
        ? `"${itemName}" is past its return date. Please return it.`
        : `"${itemName}" is due back tomorrow.`,
    });
    await db.borrowRequest.update({
      where: { id: b.id },
      data: { lastOverdueReminderAt: new Date() },
    });
  }

  return NextResponse.json({ processed: reminders.length });
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/app/api/cron/overdue/__tests__/route.test.ts`
Expected: PASS

- [ ] **Step 5: Add the cron schedule + env doc**

In `vercel.json`, add a top-level `crons` array:

```json
  "crons": [{ "path": "/api/cron/overdue", "schedule": "0 16 * * *" }]
```

In `.env.example`, add:

```
# Cron auth — Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
CRON_SECRET="generate-a-long-random-string"
```

- [ ] **Step 6: Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: clean.

```bash
git add src/app/api/cron vercel.json .env.example
git commit -m "feat(cron): daily overdue/due-tomorrow reminders (Phase 1A)"
```

---

## Task 10: UI — borrower return note + awaiting state

**Files:**

- Modify: `src/components/borrower/BorrowRequestDetail.tsx`
- Modify: `src/components/VintageCheckoutCard.tsx` (status badge)
- Test: `src/components/borrower/__tests__/BorrowRequestDetail.test.tsx`

- [ ] **Step 1: Read current return UI**

Run: `grep -n "return\|RETURNED\|status" src/components/borrower/BorrowRequestDetail.tsx | head -30`
Identify the "mark returned" control and the status display.

- [ ] **Step 2: Add an optional note field + pass it as `message`**

Add a controlled text input (optional "Note for the owner") shown next to the "Mark as returned" action; include its value as `message` in the PATCH body for `action: 'return'`. When `status === 'RETURN_PENDING'`, render an "Awaiting owner confirmation" state instead of the return button.

- [ ] **Step 3: Add the RETURN_PENDING badge**

In `VintageCheckoutCard.tsx`, wherever statuses map to label/color, add:
`RETURN_PENDING → { label: 'Awaiting confirmation', color: <amber/secondary> }`.

- [ ] **Step 4: Update/extend the component test**

In `BorrowRequestDetail.test.tsx`, add a test that when `status='RETURN_PENDING'` the component shows "Awaiting" text and does NOT show the "Mark as returned" button. Follow the file's existing render/mocking setup.

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run src/components/borrower/__tests__/BorrowRequestDetail.test.tsx && npx tsc --noEmit`
Expected: PASS / clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/borrower src/components/VintageCheckoutCard.tsx
git commit -m "feat(ui): borrower return note + awaiting-confirmation state (Phase 1A)"
```

---

## Task 11: UI — owner condition selector + report-problem

**Files:**

- Modify: `src/components/lender/BorrowRequestDetail.tsx`
- Test: existing lender component test if present, else add `src/components/lender/__tests__/BorrowRequestDetail.test.tsx`

- [ ] **Step 1: Read current owner actions**

Run: `grep -n "confirm-return\|lender-return\|status\|fetch" src/components/lender/BorrowRequestDetail.tsx | head -30`

- [ ] **Step 2: Add the condition selector**

When `status === 'RETURN_PENDING'` (or for `lender-return` on ACTIVE), render a required condition selector (OK / Minor wear / Damaged), optional note, optional photo (reuse the existing Blob upload component used elsewhere — grep `BLOB`/`upload` for the pattern). Submit `condition`, `conditionNote`, `photoUrl` in the PATCH body. Disable confirm until a condition is chosen.

- [ ] **Step 3: Add "Report a problem"**

Add a control (visible on RETURN_PENDING/RETURNED) that POSTs `action: 'report-problem'` with `disputeType`, `title`, `message`.

- [ ] **Step 4: Add a component test**

Test that confirm is disabled until a condition is selected, and that selecting "Damaged" + confirm sends `condition: 'DAMAGED'`.

- [ ] **Step 5: Run tests + typecheck + lint**

Run: `npx vitest run src/components/lender && npx tsc --noEmit && npm run lint`
Expected: PASS / clean (0 errors).

- [ ] **Step 6: Commit**

```bash
git add src/components/lender
git commit -m "feat(ui): owner condition capture + report-problem (Phase 1A)"
```

---

## Task 12: UI — lender "to confirm" surface

**Files:**

- Modify: `src/components/lender/LenderRequestsPage.tsx`
- Test: existing test for that page if present (else skip a unit test; verify via typecheck)

- [ ] **Step 1: Read the page's grouping/filtering**

Run: `grep -n "status\|filter\|ACTIVE\|RETURNED\|tab\|section" src/components/lender/LenderRequestsPage.tsx | head -30`

- [ ] **Step 2: Surface RETURN_PENDING**

Add a section/badge that highlights borrows with `status === 'RETURN_PENDING'` ("Returned — needs your confirmation"), linking to the detail view. Reuse the existing list-item rendering.

- [ ] **Step 3: Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: clean.

```bash
git add src/components/lender/LenderRequestsPage.tsx
git commit -m "feat(ui): surface RETURN_PENDING for owners (Phase 1A)"
```

---

## Task 13: Full verification

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: all green except the 2 known pre-existing `WatercolorService` failures.

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean, lint 0 errors.

- [ ] **Step 3: Build (catches build-time type-check under P0-12)**

Run: `SKIP_ENV_VALIDATION=1 npx next build` (or rely on the preview deploy)
Expected: compiles; `/api/cron/overdue` appears as a route.

- [ ] **Step 4: Push + open PR**

```bash
git push -u origin phase1a/damage-return-path
gh pr create --base main --title "Phase 1A: Damage/return path (#361)" --body "Implements docs/superpowers/specs/2026-06-27-phase-1a-damage-return-path-design.md. Closes #361."
```

- [ ] **Step 5: Verify on the preview deploy**

Confirm the preview builds green (migration applies to staging), then exercise: borrow → return (RETURN_PENDING) → owner confirm with condition → RETURNED; report-problem → Dispute; (optionally) hit `/api/cron/overdue` with the `CRON_SECRET`.

---

## Notes for the implementer

- The route file `src/app/api/borrow-requests/[id]/route.ts` is large; read the full PATCH handler before editing so the new `report-problem` early-return and the `condition` body fields integrate with the existing `authorizedUser`/`updateData`/notification flow (notifications are sent after the `switch`, keyed on `action` — add `report-problem` handling there or via the early return as shown).
- `CRON_SECRET` must be set in Vercel Production for the cron to run; until then the route safely returns 401.
- Migration runs against staging on the preview build and prod on the production build (Phase 0 wiring); a failed migration fails the deploy (P0-8).

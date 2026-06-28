# Phase 1A — Damage / Return Path (Design)

_Status: approved design, pre-implementation. Part of Phase 1 (Trust loop & friction). Sibling sub-projects (deferred): B real trust score, C tiered onboarding, D invite consolidation._

## Problem & goal

The borrow lifecycle today ends with a single hop to `RETURNED` — there's **no record of what condition the item came back in, no way to report damage, and no overdue handling**. The `Dispute` model exists but has no creation flow. Without these signals there's nothing for a real trust score (Phase 1B) to compute from.

**Goal:** capture what actually happened on return (on time? what condition? any problem?) as clean, structured signals, and nudge on overdue items — so the trust loop has real inputs.

## Scope

**In scope (v1 = "capture + report"):**

- Owner-assessed condition capture at return confirmation.
- Damage / problem reporting that creates a `Dispute` record (no admin resolution court yet).
- Overdue detection with scheduled reminder notifications (cron).
- A documented signal surface for Phase 1B to consume.
- **Fix-along:** the current `return`/`cancel` actions write columns that don't exist (`borrowerNotes`, `cancelledAt`, `cancellationReason`, `cancelledBy`) and therefore throw at runtime; this rework adds those columns so the actions work.

**Out of scope (later phases):**

- Admin dispute resolution workflow / dispute "court".
- Actual trust scoring or enforcement (Phase 1B).
- Item-condition history / before-after comparison.
- Interest matching, onboarding tiers, invite consolidation (other Phase 1 sub-projects).

## Key decisions (with rationale)

1. **v1 = capture + report**, not a full dispute system — produce signals; defer resolution to B/admin work.
2. **Owner assesses condition** on confirm/check-in — the affected party is the authoritative signal, and it gives the previously no-op `confirm-return` a real purpose.
3. **Condition on `BorrowRequest` + `Dispute` row for reported problems** — routine condition is a property of the return; a reported problem is a first-class record (reuse the existing `Dispute` model).
4. **Explicit `RETURN_PENDING` status** — the "borrower returned, owner hasn't assessed" phase is a real, queryable state (owner to-confirm queue, nudges, unambiguous signal).
5. **Overdue via daily cron + reminders** — proactive nudges, not just a passive badge.

## Schema changes (single migration)

```prisma
enum BorrowRequestStatus {
  PENDING
  APPROVED
  DECLINED
  ACTIVE
  RETURN_PENDING   // NEW: borrower returned; awaiting owner confirmation
  RETURNED
  CANCELLED
}

enum ReturnCondition { OK MINOR_WEAR DAMAGED }   // NEW

enum NotificationType {
  // ...existing...
  PROBLEM_REPORTED   // NEW: a problem/damage was reported on a borrow
}

model BorrowRequest {
  // ...existing fields...
  // Return assessment (owner-captured at confirmation)
  returnCondition       ReturnCondition?
  returnConditionNote   String?
  returnPhotoUrl        String?
  returnConfirmedAt     DateTime?
  returnConfirmedBy     String?
  returnedLate          Boolean?
  borrowerReturnNote    String?        // borrower's optional note when marking returned
  lastOverdueReminderAt DateTime?      // cron throttle
  // Fix-along: columns the existing code already writes but that don't exist
  cancelledAt           DateTime?
  cancellationReason    String?
  cancelledBy           String?
}
```

`Dispute` is reused unchanged (`type`, `status`, `priority`, `title`, `description`, `partyAId`, `partyBId`, `itemId`, `borrowRequestId`).

_Migration note: `ALTER TYPE ... ADD VALUE` for enums can't run inside a transaction in Postgres; the migration must add the enum values in their own statements. Verified deployable under the P0-8 strict build (a failed migration fails the deploy) and against staging first (P0-6)._

## Return state machine (rework `PATCH /api/borrow-requests/[id]`)

| Action           | Actor             | From → To                                 | Captures                                                                                                                                                                                                                 |
| ---------------- | ----------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `return`         | borrower          | ACTIVE → **RETURN_PENDING**               | `returnedAt` (claim), `borrowerReturnNote`; item becomes available; notify owner (`ITEM_RETURNED`)                                                                                                                       |
| `confirm-return` | owner             | RETURN_PENDING → **RETURNED**             | **required** `returnCondition`, optional note/photo; compute `returnedLate` (`returnedAt`/now vs `requestedReturnDate`); set `returnConfirmedAt/By`; notify borrower (`RETURN_CONFIRMED`); if `DAMAGED` → create Dispute |
| `lender-return`  | owner             | ACTIVE/APPROVED → **RETURNED**            | owner has the item; capture `returnCondition` in one step; set `returnedAt` + `returnConfirmedAt` together                                                                                                               |
| `report-problem` | owner or borrower | on RETURN_PENDING/RETURNED, within 7 days | create Dispute (see below); notify other party (`PROBLEM_REPORTED`)                                                                                                                                                      |

Permissions and current guards are preserved (only borrower returns; only owner confirms/checks-in). Item availability (`currentBorrowRequestId`) is cleared when the item is physically back (entering RETURN_PENDING, or RETURNED via `lender-return`).

## Damage / problem reporting

A reported problem creates a `Dispute`:

- `type`: from `DisputeType` (`ITEM_DAMAGED` | `ITEM_NOT_RETURNED` | `ITEM_NOT_AS_DESCRIBED` | `OTHER`).
- `status`: `OPEN`; `priority`: default `MEDIUM`.
- `partyA` = reporter, `partyB` = the other party; `borrowRequestId` + `itemId` linked.
- `title`/`description` from the reporter's input.

Triggered either by `returnCondition = DAMAGED` at confirmation, or the standalone `report-problem` action (covers damage found later, or borrower-side "not as described"). No admin resolution in v1 — the record + notification is the deliverable.

## Overdue cron + reminders

- **Route:** `GET /api/cron/overdue`, guarded by `CRON_SECRET` (reject unless `Authorization: Bearer $CRON_SECRET`).
- **Schedule:** `vercel.json` `crons` entry, once daily.
- **Behavior:**
  - `ITEM_DUE_TOMORROW` for ACTIVE borrows due in ~24h.
  - `ITEM_OVERDUE` for ACTIVE borrows past `requestedReturnDate`.
  - Throttle via `lastOverdueReminderAt` (≤ once / 24h per borrow); update it after sending.
- **Testability:** the selection + throttle decision is a pure function `selectOverdueReminders(borrows, now)` in `src/lib/overdue.ts`, unit-tested; the route is a thin wrapper (auth → query ACTIVE borrows → call function → send notifications → persist `lastOverdueReminderAt`).

## Notifications

Reuse `ITEM_RETURNED`, `RETURN_CONFIRMED`, `ITEM_OVERDUE`, `ITEM_DUE_TOMORROW`. Add `PROBLEM_REPORTED` (enum + `notification-service` handling + email template). All sends use the existing `createNotification` helper.

## Trust-score signal surface (contract for Phase 1B)

Phase 1B will read, without reworking 1A:

- `BorrowRequest.returnedLate` (boolean) — late returns.
- `BorrowRequest.returnCondition === 'DAMAGED'` — damaged returns.
- Open `Dispute`s by party (`partyAId`/`partyBId`, `status`, `type`).

1A only **records** these; it performs no scoring or enforcement.

## UI

- **Owner** (lender borrow-request view): `confirm-return` gains a condition selector (OK / minor wear / damaged), optional note + optional photo (existing Blob upload), and a "report a problem" affordance.
- **Borrower**: optional note when marking returned; sees an **"awaiting owner confirmation"** state; sees if a problem was reported.
- **Status badges:** add `RETURN_PENDING` → "Awaiting confirmation".
- **Owner to-confirm surface:** highlight RETURN_PENDING borrows on the lender requests page.

## Testing

- Transition unit tests: `return` → RETURN_PENDING; `confirm-return` requires condition, → RETURNED, computes `returnedLate`, DAMAGED → Dispute; `lender-return` one-step; `report-problem` creates Dispute within window, rejects outside; permission guards for each.
- `selectOverdueReminders` pure-function tests (due-tomorrow, overdue, throttle window, no double-send).
- Regression: existing approve/decline/cancel actions still pass (and cancel now actually persists its fields).
- Full suite green except the 2 known pre-existing `WatercolorService` failures.

## Rollout

- Build/verify against **staging** first (Phase 0 wiring); the enum migration must succeed under the strict deploy (P0-8).
- No backfill needed — new fields are nullable; existing RETURNED borrows simply lack condition data.
- `CRON_SECRET` must be set in Vercel (Production) for the cron route to function; until then the route rejects unauthenticated calls (safe no-op).

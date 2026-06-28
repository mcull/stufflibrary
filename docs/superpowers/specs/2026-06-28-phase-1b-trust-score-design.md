# Phase 1B — Trust Score (Design)

_Status: approved design, pre-implementation. Part of Phase 1 (Trust loop & friction). Sibling sub-projects: A damage/return path (shipped, #362), C tiered onboarding, D invite consolidation._

## Problem & goal

`User.trustScore` exists (default `1000.0`) with `warningCount`/`suspensionCount`/`isSuspended` fields, but `trust-safety.ts` is fully stubbed (`calculateTrustScore()` returns a hardcoded `100`) and nothing ever updates the score. Meanwhile Phase 1A now emits real signals (on-time/late/damaged returns, disputes). The borrow flow has no notion of who is reliable.

**Goal:** make the trust score real — a transparent, tunable 0–100 reputation recomputed from actual behavior + account standing, cached on the user, and surfaced as a gentle tier badge to others and a number to oneself. **No automated enforcement** in this phase.

## Scope

**In scope (v1 = "compute + display"):**

- A pure scoring function (0–100) blending borrow behavior with account standing.
- A recompute service that gathers facts and caches `trustScore` + `trustTier` on the user.
- Recompute triggers: key events (return confirmed, dispute created, report filed) + a daily cron sweep.
- Display: tier badge to others, numeric score + tier + improvement hint to self, real number for admins.

**Out of scope (later):**

- Automated suspension / borrow gating / enforcement.
- The `UserReport` _submission_ UI (we read reports if they exist; we don't build the report-filing flow here).
- The `trust-safety.ts` automated-flagging engine and `AdminAction` execution.

## Key decisions (with rationale)

1. **Compute + display, no enforcement** — pre-launch with thin data, auto-suspension risks locking out real users. Enforcement is a later, separate decision.
2. **Recomputed composite, not event-sourced points** — deterministic, no drift, weights are retunable without rewriting history, trivially unit-testable. Cache the result on `User.trustScore`.
3. **0–100 scale** — intuitive for display; repurposes the existing field (the `1000` default was never used meaningfully).
4. **Behavior + account standing**, blended by a confidence ramp — gives new users (no borrow history) a sensible starting score and rewards complete/verified profiles, while behavior dominates as history accrues.
5. **Recompute on key events + daily cron** — always fresh and self-healing (the cron catches the time-based account-age factor and any missed event), reusing the 1A cron infra.
6. **Tier to others, number to self** — useful signal for lending decisions without the harshness/gaming of a public number.

## Scoring model

A pure function `computeTrustScore(facts): number` returns a 0–100 score (rounded). It blends two sub-scores:

**Facts (gathered per user):**

- `completedBorrows` — borrows the user borrowed that reached RETURNED.
- `onTimeReturns`, `lateReturns` — among completed (from `returnedLate`).
- `damagedReturns` — completed with `returnCondition === 'DAMAGED'`.
- `openDisputes` — OPEN disputes where the user is a party.
- `reportsAgainst` — UserReports against the user (PENDING or upheld).
- `profileComplete` (bool), `emailVerified` (bool), `addressVerified` (bool), `accountAgeDays` (number).

**Account-standing sub-score (0–100)** — baseline `40`, plus: profile complete `+20`, email verified `+10`, address verified `+15`, account age `+min(accountAgeDays / 30, 1) * 15`. (Caps at 100.)

**Behavior sub-score (0–100)** — start from on-time rate: `100 * onTimeReturns / max(completedBorrows, 1)`; then subtract penalties: `−15` per damaged return, `−10` per late return (beyond the rate effect is fine — penalties are additive and the result is clamped), `−20` per open dispute, `−10` per report against; plus a small volume bonus `+min(completedBorrows, 10) * 1`. Clamp to 0–100.

**Blend:** `w = min(completedBorrows / 5, 1)`; `score = round(behavior * w + accountStanding * (1 - w))`, clamped 0–100.

**All weights are named constants at the top of `trust-score.ts`** so they're trivial to tune. The exact numbers above are a starting point, expected to be adjusted.

## Tiers

`tierForScore(score, completedBorrows): Tier`:

- **New** — `completedBorrows === 0` (regardless of score).
- **Building** — score < 60.
- **Trusted** — 60 ≤ score < 85.
- **Highly Trusted** — score ≥ 85.

Type: `type TrustTier = 'NEW' | 'BUILDING' | 'TRUSTED' | 'HIGHLY_TRUSTED'`.

## Schema changes (one migration)

- `User.trustScore` — change default `1000.0` → `50.0` (neutral pre-recompute baseline on the new 0–100 scale). Existing rows keep `1000` until the first cron sweep recomputes them (the sweep backfills everyone).
- `User.trustTier String?` — cached tier label so any surface renders the badge from the user record without recomputing.

No other schema changes (`UserReport`, `Dispute`, `BorrowRequest.returnCondition/returnedLate` already exist).

## Recompute service

`recomputeUserTrustScore(userId): Promise<void>` (in `src/lib/trust-score.ts` or a thin `trust-score-service.ts`):

1. Query the facts for the user (borrow requests as borrower with statuses/returnedLate/returnCondition; open disputes; reports against; the user's profile/verification/createdAt).
2. `score = computeTrustScore(facts)`; `tier = tierForScore(score, facts.completedBorrows)`.
3. `db.user.update({ where: { id }, data: { trustScore: score, trustTier: tier } })`.
   Errors are logged and swallowed (never break the triggering request).

## Triggers

- **Events** — call `recomputeUserTrustScore(borrowerId)` after: `confirm-return` / `lender-return` succeed; a `Dispute` is created (the reported party / borrower); a report is filed. Wrapped so failures don't break the action (matches the 1A logging pattern).
- **Daily cron** — `GET /api/cron/recompute-trust`, guarded by `CRON_SECRET` (same pattern as `/api/cron/overdue`); iterates active users and recomputes each. Registered in `vercel.json` `crons`. Bounded by user count; fine at launch scale.

## Display

- **`TrustBadge` component** — maps `TrustTier` → label + color (New · Building · Trusted · Highly Trusted). Reused across surfaces.
- **Others:** the owner reviewing a borrow request sees the borrower's `TrustBadge`; tier badges appear on member/profile views where members are shown.
- **Self:** the user's profile shows their **numeric `trustScore` + tier** and a short improvement hint (e.g., "Complete your profile and return items on time to raise your score").
- **Admin:** replace the _synthetic_ trust calc in `src/app/api/admin/users/route.ts` with the real persisted `trustScore` (number) so admin views reflect the actual value.

## Testing

- **Pure fn** (`computeTrustScore`, `tierForScore`): cold start (0 borrows → leans on standing), all-good history → high, damaged/late/dispute/report penalties each lower the score, the confidence ramp (history shifts weight to behavior), and each tier threshold incl. `NEW`.
- **`recomputeUserTrustScore`**: mocked db — gathers facts, writes the expected `trustScore` + `trustTier`.
- **Triggers**: confirm-return / dispute creation call recompute (mocked); cron route auth (401 without secret) + sweeps users.
- Full suite green except the 2 known pre-existing `WatercolorService` failures.

## Rollout

- Migration applies on the staging preview build then prod (Phase 0 wiring); a failed migration fails the deploy (P0-8).
- The first daily cron run recomputes/​backfills all existing users off the old `1000` default; `CRON_SECRET` is already set in production.
- No enforcement, so there is no risk of locking users out — worst case a score is briefly stale until the next event or sweep.

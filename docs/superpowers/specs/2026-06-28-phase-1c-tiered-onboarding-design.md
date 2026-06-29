# Phase 1C — Tiered Onboarding (Graduated Capability)

**Issue:** #367
**Branch:** `phase1c/tiered-onboarding`
**Status:** Design (spec)
**Date:** 2026-06-28
**Part of:** Phase 1 — Trust loop & friction (A #361 ✅, B #363 ✅, D #365 ✅, **C** = this)

## Problem

Today onboarding is all-or-nothing. A new user must finish the entire 3-step
profile wizard — name, address, photo, bio, interests, and five agreement
checkboxes — before `User.profileCompleted` flips to `true`. Until then every
authenticated page redirects them to `/profile/create`. They cannot even look
inside a library they were invited to until they have handed over everything.
That is maximum friction at the exact moment we most want a new member to feel
welcome, and it gives us no way to graduate trust.

Meanwhile Phase 1B shipped a real `trustTier` (`NEW` → `BUILDING` → `TRUSTED`
→ `HIGHLY_TRUSTED`) but it is **display-only** — nothing in the product gates on
it. We have the raw material for a graduated model but none of the gating.

## Goal

A **graduated capability** model on two independent axes:

- **Completeness axis** (what the user has told us): low-friction entry, then
  unlock the core borrow/lend actions once the profile is complete enough.
- **Trust axis** (how the user has behaved — the 1B `trustTier`): unlock the
  higher-risk / higher-volume actions as trust accrues.

Lower the bar to get _in_; raise the bar for actions whose blast radius is real.

## Capability map

| Capability                                                                                      | Gate                                                                                            |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Enter the app, browse libraries you belong to, **join** a library via invite, edit your profile | **Minimal profile** — name + terms accepted                                                     |
| **Lend** (create an item), **request to borrow**, **create a library**                          | **Full profile** — minimal + profile photo + verified address                                   |
| **Invite** another person into a library as a **non-owner member**                              | **Trust tier ≥ TRUSTED** (library owners/admins always exempt)                                  |
| Number of **concurrent open borrows**                                                           | Tier-scaled cap: `NEW` 2 → `BUILDING` 4 → `TRUSTED` 8 → `HIGHLY_TRUSTED` 20 (tunable constants) |

### Definitions

- **Minimal profile** = `name` present **and** terms accepted (`agreedToTermsAt`
  set). Nothing else required to enter.
- **Full profile** = minimal **and** a profile photo (`User.image`) **and** an
  active verified `Address` (a row in `Address` with `isActive = true` and a
  `verificationMethod`, referenced by `User.currentAddressId`). `profileCompleted`
  continues to denote this "full" state.
- **Open borrow** (counts toward the concurrent cap) = a `BorrowRequest` where
  the user is the borrower and `status ∈ {PENDING, APPROVED, ACTIVE,
RETURN_PENDING}` (i.e. anything not terminal — not `DECLINED`, `RETURNED`, or
  `CANCELLED`). The cap is enforced at request-creation time.

### Two confirmed product decisions

1. **Member invites are a small new capability.** Today only a library's
   owner/admin can invite anyone. This phase adds: a non-owner _member_ may
   invite once they reach `TRUSTED`. Owners/admins remain unrestricted.
2. **Create-a-library is gated by completeness only**, not by trust. A
   brand-new but full-profile user can still start a library.

## Architecture

### Single source of truth: `src/lib/capabilities.ts`

A pure, fully-tested module — the same shape Phase 1B used for `trust-score.ts`
(pure compute, thin callers). Routes, server actions, and UI all call into it so
the server's enforcement and the UI's locked-state rendering can never disagree.

```ts
// Inputs are plain facts, not a Prisma row, so the function stays pure & testable.
export interface CapabilityFacts {
  hasName: boolean;
  hasAcceptedTerms: boolean;
  hasPhoto: boolean;
  hasVerifiedAddress: boolean;
  trustTier: TrustTier | null; // from 1B
  openBorrowCount: number; // caller supplies the live count
  isLibraryOwnerOrAdmin: boolean; // context for the invite gate
}

export interface Capabilities {
  canEnter: boolean;
  canLend: boolean;
  canBorrow: boolean;
  canCreateLibrary: boolean;
  canInvite: boolean;
  concurrentBorrowLimit: number;
  atBorrowLimit: boolean;
  // machine-readable reasons so the UI can show the right CTA
  reasons: Partial<
    Record<
      'canLend' | 'canBorrow' | 'canCreateLibrary' | 'canInvite',
      | 'NEEDS_PHOTO'
      | 'NEEDS_ADDRESS'
      | 'NEEDS_TERMS'
      | 'NEEDS_TRUST_TIER'
      | 'AT_BORROW_LIMIT'
    >
  >;
}

export function getCapabilities(facts: CapabilityFacts): Capabilities;

// Tunable named constants, mirroring trust-score.ts's weight constants.
export const CONCURRENT_BORROW_LIMITS: Record<TrustTier, number> = {
  NEW: 2,
  BUILDING: 4,
  TRUSTED: 8,
  HIGHLY_TRUSTED: 20,
};
export const MIN_TIER_TO_INVITE: TrustTier = 'TRUSTED';
```

A thin server-side helper (e.g. `getUserCapabilities(userId, context?)`) loads
the user, derives the facts (photo, verified address, terms, tier), runs the
live `openBorrowCount` query, and returns `Capabilities`. Routes call this
helper; the pure `getCapabilities` holds all the policy and is unit-tested
exhaustively.

## The five pieces

### 1. Data / migration (small)

- **Fix-along — persist terms acceptance.** The wizard renders five agreement
  checkboxes (`agreedToHouseholdGoods`, `agreedToTrustAndCare`,
  `agreedToCommunityValues`, `agreedToAgeRestrictions`, `agreedToTerms`) but
  `POST /api/profile`'s Zod schema drops them — **terms acceptance is never
  persisted today**, so there is no record a user agreed. Since terms now gate
  entry, add `User.agreedToTermsAt DateTime?` plus a `TERMS_VERSION` constant in
  code (store the version the user accepted, e.g. `User.agreedTermsVersion
String?`, so a future terms change can re-prompt). The POST route persists
  `agreedToTermsAt = now()` and the version when all five boxes are checked.
- **Minimal-vs-full tracking.** Reuse the existing `User.onboardingStep` string:
  `'minimal'` after the minimal step, `'complete'` after full profile. No new
  enum column. `profileCompleted` stays as the canonical "full profile" boolean.
- **No new columns** for borrow count or invite eligibility — both are derived
  (live `BorrowRequest` count; `trustTier` already on `User`).
- The dead `SignupApplication` model is **out of scope** — leave it; removing it
  is unrelated cleanup.

### 2. `capabilities.ts` (heavy TDD)

Pure function + the constant maps above. Tests cover every gate transition:
each missing completeness signal blocks the right action with the right reason;
each tier yields the right borrow limit and invite eligibility; owner/admin
bypasses the invite tier gate; boundary at the borrow limit.

### 3. Onboarding restructure (minimal entry)

- Split the wizard into a **minimal entry step** (name + the agreement
  checkboxes) that, on submit, persists name + `agreedToTermsAt` + sets
  `onboardingStep = 'minimal'` and lands the user in `/stacks`. The photo +
  address + interests steps become the **"complete your profile"** flow,
  reachable from the just-in-time prompts and from a profile page CTA.
- **Entry redirects.** Today authenticated pages do `if (!profileCompleted)
redirect('/profile/create')` (e.g. `src/app/stacks/page.tsx`,
  `src/app/profile/page.tsx`) and `auth/callback` routes on `profileCompleted`.
  Change these to gate on **minimal completion** (`onboardingStep` set / name +
  terms present), not full completion, so a minimal user reaches the app.
  `profileCompleted` is no longer the app-entry gate; it becomes the lend/borrow
  gate (piece 4).
- Keep the existing localStorage draft + Google Places address machinery; we are
  re-sequencing steps, not rewriting them.

### 4. Just-in-time prompts + server enforcement

- **Client:** when a minimal user invokes Lend, Borrow, or Create-library, show
  a "finish your profile to do this" interstitial that routes into the complete-
  profile flow (driven by the capability `reasons`, e.g. "Add a photo and verify
  your address to borrow").
- **Server (authoritative):** add the gate to the POST routes —
  - `src/app/api/items/route.ts` (+ `create-draft`, `create-with-watercolor`) →
    require full profile (`canLend`).
  - `src/app/api/borrow-requests/route.ts` → require full profile (`canBorrow`)
    **and** enforce the concurrent-borrow cap (`atBorrowLimit` → 4xx with a
    clear message). This is in addition to the existing `status: 'active'` check.
  - `src/app/api/collections/route.ts` POST → require full profile
    (`canCreateLibrary`).
  - The member-invite path (`src/app/api/collections/[id]/invite/route.ts` and
    related) → if the inviter is not the owner/admin, require `trustTier ≥
TRUSTED` (`canInvite`). Owners/admins unchanged.
- Every server gate returns a structured error (`{ error, reason }`) the client
  maps to the same CTA copy, so client and server never diverge.

### 5. UI surfaces

- Locked/disabled affordances (Lend / Borrow / Create-library buttons, the
  member Invite control) render in a disabled state with a tooltip/reason and a
  "complete profile" CTA when the capability is unavailable — fed by
  `getCapabilities` so the UI matches the server exactly.
- A lightweight **profile-completeness indicator** (e.g. on the profile page and
  a dismissible banner in `/stacks`) showing what's left to unlock borrowing and
  lending. Keep it small; no gamified XP bar.

## Testing strategy

- **Unit (the spine):** exhaustive tests for `getCapabilities` and the constant
  maps — every reason, every tier, the owner/admin bypass, the borrow-limit
  boundary.
- **Server helper:** `getUserCapabilities` derives facts correctly (photo,
  verified-address, terms, tier) and counts open borrows with the right status
  set.
- **Route enforcement:** each gated route rejects an under-qualified user with
  the right status/reason and admits a qualified one; borrow route rejects at the
  cap and admits below it; member-invite rejects a non-owner below `TRUSTED` and
  admits an owner / a `TRUSTED` member.
- **Onboarding flow:** minimal submit persists name + terms and lands in
  `/stacks`; a minimal user is not bounced to `/profile/create`; a minimal user
  hitting a gated action gets the prompt.
- Full suite green before claiming done (the 2 known watercolor failures are
  pre-existing — confirm via `git stash`). `tsc`/lint clean, `next build` OK.
  ⚠️ If App Router route files are added/removed, `rm -rf .next` before `tsc`
  (stale generated types).

## Out of scope (YAGNI)

- Removing/repurposing `SignupApplication` (unrelated dead-code cleanup).
- Guest-pass / read-only preview of a library before joining (closed issue #303
  — separate feature).
- Trust-gated library creation, borrow auto-approval, and per-item value tiers
  (not selected; can be layered on the same module later).
- Activating `Collection.inviteRateLimitPerHour` (we use a hard tier gate on
  member invites, not a rate limit).

## Rollout / data notes

- Existing users already have `profileCompleted = true` and an `image`/address,
  so they keep full capability. Their `agreedToTermsAt` will be null until they
  next accept (acceptable — backfill is optional and can be a one-off if we want
  a clean record).
- `trustTier` may be null for users the 1B daily cron hasn't recomputed yet;
  treat null tier as `NEW` for gating (most conservative) in the server helper.

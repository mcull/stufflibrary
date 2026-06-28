# Phase 1D — Invite Consolidation (Design)

_Status: approved design, pre-implementation. Part of Phase 1 (Trust loop & friction). Sibling sub-projects: A damage/return (shipped #362), B trust score (shipped #364), C tiered onboarding (not started)._

## Problem & goal

Seven invite/join code paths re-implement the same handful of operations, with subtle inconsistencies (the bug class behind P0-13). The duplication makes the invite flow fragile and hard to reason about.

The repeated operations:

1. **Idempotent membership** — find membership → create if absent → reactivate if inactive (the P0-13 guard).
2. **Accept invitation** — set `status: 'ACCEPTED'`, `acceptedAt`, `receiverId`.
3. **Invite cookies** — set/clear `invite_token` + `invite_library`.
4. **Validate a library invite token** — find a `library` invite in `PENDING`/`SENT` + expiry check.

**Goal:** extract these into one tested module and refactor every path to use it — a **behavior-preserving** internal cleanup. No external entry point changes.

## Current paths (reference map)

| Path                                              | Role                                                 | Live?                              |
| ------------------------------------------------- | ---------------------------------------------------- | ---------------------------------- |
| `src/app/j/[token]/route.ts`                      | invite landing (email links use `/j/${token}`)       | **canonical**                      |
| `src/app/invite/[token]/route.ts`                 | identical landing duplicate                          | keep URL working; dedupe internals |
| `src/app/api/invite/consume/route.ts`             | post-auth cookie consume (called by `auth/callback`) | live                               |
| `src/app/api/invite/complete-join/route.ts`       | post-auth consume (no callers anywhere)              | **dead → delete**                  |
| `src/app/api/auth/magic-link/route.ts`            | email magic-link join                                | live                               |
| `src/app/api/collections/[id]/join/route.ts`      | "Join" button / invite join (+ DELETE leave)         | live                               |
| `src/app/api/invitations/[token]/accept/route.ts` | in-app accept of a pending invite                    | live                               |
| `src/app/api/libraries/[id]/join/route.ts`        | re-export alias of collections join (no references)  | **dead → delete**                  |

Verified via grep: `/j/` is the only route built into invite emails; `complete-join` and `libraries/[id]/join` have no references in `src/`.

## Scope

**In scope (behavior-preserving extraction + dedupe):**

- New `src/lib/invite.ts` module with the four shared operations.
- A shared `handleInviteLanding(request)` used by both `j/[token]` and `invite/[token]`.
- Refactor `invite/consume`, `collections/[id]/join`, `auth/magic-link`, `invitations/[token]/accept` to call the shared helpers.
- Delete the two dead routes (`invite/complete-join`, `libraries/[id]/join`).
- Unit tests for the shared module; smoke tests preserved/added per refactored route.
- Clean up the P0-13-era debug `console.log`s in the landing routes.

**Out of scope:**

- Changing any external entry point (email link format, frontend fetch URLs, redirects).
- Invite _creation_ (`collections/[id]/invite`) and `invitations/pending` beyond using the new validate/accept helpers if convenient.
- The guest-preview UX, auth flow, or any product behavior change.

## Key decisions (with rationale)

1. **Behavior-preserving extraction**, not full unification — every email link and frontend caller keeps working; the risk is confined to internal refactor, not the externally-referenced surface.
2. **One module (`src/lib/invite.ts`)** as the single source of truth — especially `ensureActiveMembership`, so the duplicate-membership guard lives in exactly one place.
3. **Both landing URLs delegate to one handler** — `/j/` (canonical) and `/invite/` both stay valid for any in-the-wild links, with zero duplicated logic.
4. **Delete dead routes** — `complete-join` and `libraries/[id]/join` have no references; removing them reduces surface area.

## The shared module: `src/lib/invite.ts`

```ts
// Idempotent: create if absent, reactivate if inactive, no-op if already active.
export async function ensureActiveMembership(
  userId: string,
  collectionId: string
): Promise<{ created: boolean; reactivated: boolean }>;

// Marks the library invitation accepted by this user.
export async function acceptInvitation(
  token: string,
  collectionId: string,
  userId: string
): Promise<void>;

export type InviteValidation =
  | { ok: true; invitation: { libraryId: string; expiresAt: Date } }
  | { ok: false; reason: 'invalid' | 'expired' };

export async function validateLibraryInvite(
  token: string
): Promise<InviteValidation>;

// Cookie helpers operate on a NextResponse.
export function setInviteCookies(
  res: NextResponse,
  token: string,
  libraryId: string
): void;
export function clearInviteCookies(res: NextResponse): void;
```

`ensureActiveMembership` uses `findUnique({ userId_collectionId })` then `create` / `update` (matching the existing guarded routes), so concurrent calls are still protected by the DB unique constraint. Each function is pure of HTTP concerns (except the cookie helpers, which take a `NextResponse`) and unit-testable with a mocked `db`.

## Landing handler

Extract the `/j/[token]` GET body into `handleInviteLanding(request: NextRequest): Promise<NextResponse>` (colocated, e.g. `src/app/j/[token]/handler.ts` or exported from the module). It: validates the token (`validateLibraryInvite`), and — if authenticated — `ensureActiveMembership` + `acceptInvitation` + redirect to the collection with `clearInviteCookies`; otherwise sets guest cookies (`setInviteCookies`) and redirects to the guest preview. Both `j/[token]/route.ts` and `invite/[token]/route.ts` become one-line wrappers: `export const GET = handleInviteLanding`-style delegation (adapting to the `{ params }` signature). Debug logging removed.

## Refactored consumers

- `invite/consume` → read cookies, `validateLibraryInvite`, `ensureActiveMembership`, `acceptInvitation`, `clearInviteCookies`.
- `collections/[id]/join` (POST) → keep its public-vs-invite gating, but use `ensureActiveMembership` + `acceptInvitation` + `clearInviteCookies` for the shared parts. (DELETE/leave is unchanged.)
- `auth/magic-link` → use `ensureActiveMembership` + `acceptInvitation` for its membership/accept steps (its auth-code generation + redirect stay).
- `invitations/[token]/accept` → use `ensureActiveMembership` + `acceptInvitation` (its email-match guard + response shape stay).

Each refactor is behavior-preserving: same status transitions, same responses/redirects, same cookies.

## Deletions

- `src/app/api/invite/complete-join/route.ts` — dead.
- `src/app/api/libraries/[id]/join/route.ts` — dead alias.

The implementer re-greps for references immediately before deleting each; if any reference is found, that route is kept and pointed at the shared helpers instead.

## Testing

- **`src/lib/__tests__/invite.test.ts`** (new, mocked `db`): `ensureActiveMembership` (create / reactivate / already-active no-op), `acceptInvitation` (updates the invite), `validateLibraryInvite` (valid / expired / not-found). This is the first real coverage of this logic.
- **Route smoke tests:** the existing P0-13 duplicate-guard behavior stays green; add/keep a smoke test per refactored route (authenticated landing joins once; consume joins from cookies; accept respects the email guard). Follow existing route-test patterns.
- Full suite green except the 2 known pre-existing `WatercolorService` failures; tsc + lint clean.

## Rollout

- No schema change, no migration, no env change — pure code.
- Behavior-preserving, so prod/preview deploys carry no data risk; the value is reduced duplication and one tested join path.

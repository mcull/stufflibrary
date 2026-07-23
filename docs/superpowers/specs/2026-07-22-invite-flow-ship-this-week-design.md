# Invite flow — ship-this-week fixes

**Date:** 2026-07-22
**Source:** "Invite Flow Redesign" dossier (claude.ai/design project `b1e5907c-6dae-4a64-b6ae-90d68dffdfb8`), Section B, "SHIP THIS WEEK — BEFORE ANY REDESIGN". Grounded against `docs/product/InviteFlows.md` §6.
**Scope decision:** Fixes first, then redesign. This spec covers only the four bug-level fixes. The experience redesign (front porch visual treatment, stamp/sign-card screens, email rebuild, sender-side funnel visibility, "have a code?" on `/home`, decline/cancel) gets its own spec later.

**Delivery:** One PR, branch `fix/invite-flow-ship-this-week` off `main`. Four independent fixes, TDD, one test suite per fix.

## Why now

The first real batch of six personal invites produced zero joins. The recorded run shows the flow's actual observed ending: email → code → profile → "No memberships yet." The invite was never consumed because a stray tap on the feedback link rewrote `callbackUrl` and the post-auth router never ran consume-invite. Every fix below removes a way the system forgets why the invitee came.

## Fix 1 — consume-invite always wins the post-auth route

**Bug:** `src/app/auth/signin/page.tsx:48` lets a `?callbackUrl=` query param _replace_ `/auth/callback` as the post-auth destination. Any page that bounces an unauthenticated user to sign-in (e.g. `/feedback`) plants a `callbackUrl` that skips the smart callback entirely — so `/api/invite/consume` never runs and the invitation is silently abandoned.

**Change:**

- `src/app/auth/signin/page.tsx`: the post-auth destination is _always_ `/auth/callback`. If a `callbackUrl` query param arrived, carry it as `/auth/callback?next=<path>` — but only when it is a relative same-origin path (starts with `/`, not `//`); otherwise drop it. The legacy `?invitation=`/`?library=` params keep flowing to `/auth/callback` as today.
- `src/app/auth/callback/page.tsx`: after the consume attempt returns no invite outcome (no redirect, no error), fall through to `next` (same validation applied again) before the existing `minimalDone ? /home : /profile/create` default. When the profile is minimal, `/profile/create?returnTo=<dest>` continues to interpose exactly as today — `next` just becomes one more possible `returnTo`.

**Result:** signing in mid-invite always consumes the invite first; `next` is a fallback, never an override. `/feedback` still works — you arrive there _after_ your membership exists.

**Not touched:** NextAuth's `redirect` callback in `src/lib/auth.ts` (it also fires for sign-out and the admin GitHub login; enforcing there would need exemptions). Admin login (`signIn('github', { callbackUrl: '/admin' })`) is a separate provider and page, untouched.

## Fix 2 — pending invites actually surface (§6.8)

**Bug:** `src/app/api/invitations/pending/route.ts:31` filters `type: 'collection'`, but every invitation is written with `type: 'library'` — the in-app "you've been invited" panel has been permanently empty.

**Change:** the filter becomes `type: 'library'`. Regression test: a pending `type: 'library'` invitation for the session email is returned.

## Fix 3 — bound invitees get the front porch (§6.1)

**Bug (design, not code):** the invite email already links `/join/<shortCode>`, but for a signed-out bound invitee `handleInviteLanding` (`src/lib/invite.ts:243-250`) redirects to `/auth/signin` — the login wall. A flyer stranger (zero trust signal) gets a full guest preview; the personally-vouched-for neighbor gets a form.

**Change:** in `handleInviteLanding`'s signed-out branch, redirect to `/library/<id>?guest=1` with the invite cookies set — mirroring `handleJoinCodeLanding`. Rewrite the "no guest preview for a personal invite" comment to record the reversal and the evidence (0/6 conversions; the preview grants nothing and burns nothing).

**Downstream already works:** guest page join CTA → 401 → `/auth/signin` (email pre-filled and locked from the invite cookie via `/api/invite/context`) → `/auth/callback` → consume → library.

**Invariants:** all seven untouched. The email-binding check still runs at consume and at signed-in landing; the preview grants no membership and burns no invite; the invited address still never travels in URLs or client-readable state.

## Fix 4 — sunset the legacy auto-sign-in path (§6.3)

**Bug:** `/api/invitations/[token]` forwards live invites into `/api/auth/magic-link`, which auto-creates the account from the invite's email, auto-signs-in, and auto-joins — a live contradiction of the no-auto-sign-in posture every email from the old era can still trigger.

**Change:**

- `src/app/api/invitations/[token]/route.ts`: replace the magic-link handoff (and the ACCEPTED→signin special case) with a redirect into the new flow — `handleInviteLanding` already handles valid, expired, already-member, and wrong-account uniformly.
- `src/app/api/auth/magic-link/route.ts`: gut the auto-create/auto-sign-in; a `?token=` request redirects into the same landing. The route is kept so bookmarked URLs degrade gracefully; it becomes deletable later.
- Existing magic-link tests are updated to assert the redirect instead of the auto-join.

**Result:** no user is ever authenticated without typing a code. Old emails keep working — they just land on the new flow.

## Testing

- Unit tests per fix: signin `callbackUrl` computation (hijack attempt → `/auth/callback?next=...`; absolute/protocol-relative URL → dropped), callback `next` fallback ordering, pending filter regression, `handleInviteLanding` signed-out redirect target + cookies, legacy route redirects.
- One manual end-to-end pass with a real bound invite on a preview deployment before merge.

## Out of scope

Everything in the dossier's redesign tier: front porch visual treatment, claim/stamp/sign-your-card screens, landing copy, email rebuild (from-name, Reply-To, personal note field, item art), sender-side funnel (opened/joined states, cancel, re-send), "have a code? type it here" on `/home` and sign-in, decline/cancel statuses, flyer steward UI.

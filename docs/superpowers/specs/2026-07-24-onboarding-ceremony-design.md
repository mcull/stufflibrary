# Onboarding ceremony — the stamp & sign-your-card

**Date:** 2026-07-24
**Source:** "Invite Flow Redesign" dossier (claude.ai/design `b1e5907c-6dae-4a64-b6ae-90d68dffdfb8`), Section C screens 3 ("The Stamp") & 4 ("Sign your card"), and `docs/product/InviteFlows.md` §6.5/§6.6.
**Sub-project:** C of the invite-flow redesign tier. B (guest preview) shipped in #508, A (invite email) in #509. Remaining after C: D arrival, E sender funnel, F recovery, G flyer steward. Decomposition tracked in memory `stufflibrary-invite-flow-redesign`.

## Why

Two adjacent moments carry the most friction and the least warmth. The **6-digit code** (§6.6) is the flow's steepest step — leave the site, hunt the inbox, memorize, return, type — presented as a generic checkpoint. The **profile-create agreements** (§6.5) set up "your library card" and then deliver five checkboxes about account closure, firearms, and Terms, which read as five separate warnings that something goes wrong. This sub-project restages both as the library-card ceremony the product's fiction promises: the code as a stamp, the agreements as one signature.

## Two findings that narrow the scope

1. **Photo/address deferral already shipped.** `ProfileStep1` already leads with the minimal "Get started" path ("A photo and your address can come later") and a secondary "Add a photo & address now." C does **not** re-architect the flow — it restyles the two screens and collapses the agreements.
2. **The legal record is already one affirmation.** The `User` model persists only `agreedToTermsAt` (a timestamp); `POST /api/profile` validates a single `agreedToTerms` boolean and rejects without it. The 4 guideline booleans (`agreedToHouseholdGoods`, `agreedToTrustAndCare`, `agreedToCommunityValues`, `agreedToAgeRestrictions`) are **client-side form gates only** — never sent to or stored by the server. So "5 checkboxes → 1 promise" changes the UI gate, not the persisted assent.

## Decisions (from brainstorming)

1. **Guideline content:** one promise checkbox, with the 4 guideline points shown inline as a short readable list (not 4 checkboxes) — those points _are_ the house rules — and the existing `/terms` and `/privacy` pages linked (versioned).
2. **Terms versioning:** add a `termsVersion` stamp on `User`, recorded alongside `agreedToTermsAt` on signing, so there is a per-user record of which version was accepted.
3. **Code input:** six auto-advancing, paste-friendly, accessible cells + a resend link with a countdown.
4. **Stamp framing is adaptive:** the code screen serves every sign-in. The library-card "we stamped your card" treatment shows only when a bound invite is in flight (`boundEmail` set); a plain sign-in gets warm-but-neutral copy — no card fiction where none applies.
5. **The signature is the name.** Typing your name onto the card _is_ the profile name field — one field serves both. Membership already exists before this screen (created at consume), as today.
6. **Promise copy:** "I'll take care of the stuff I borrow, and won't lend anything irreplaceable." Two-sided on purpose (careful borrower, unprecious lender) — the tone is "nobody here is uptight about stuff," not a liability warning. Legal coverage rides on the House Rules + Terms links beside it, not on the sentence.

## Architecture

Three units.

### 1. Data / legal record

- **Migration:** add `termsVersion String?` to `User` (nullable; existing users stay null until they next sign).
- **Constant:** `CURRENT_TERMS_VERSION` in a shared module (e.g. `src/lib/terms.ts`) — a stable string (e.g. a date like `'2026-07-24'`). The sign-your-card screen (and, if trivial, the `/terms` page) display the same label.
- **`POST /api/profile`:** in both the minimal path and the full path, when `agreedToTerms` is true, write `termsVersion: CURRENT_TERMS_VERSION` alongside the existing `agreedToTermsAt: new Date()`. The `agreedToTerms` gate and everything else is unchanged.

### 2. The stamp — `src/app/auth/signin/page.tsx` + new `src/components/CodeCells.tsx`

- **`CodeCells` (new, own file + tests):** a self-contained controlled component. Props: `value: string`, `onChange: (v: string) => void`, `onComplete?: (v: string) => void`, `disabled?`, `length` (default 6). Behavior: six single-digit inputs; typing a digit advances focus; backspace on an empty cell retreats; **paste of a 6-digit string fills all cells**; non-digits ignored; `inputMode="numeric"`, `autoComplete="one-time-code"` on the first cell, an aria-label per cell ("Digit 1 of 6"). Calls `onComplete` when all six are filled. One clear responsibility, no auth knowledge.
- **signin code step:** replace the single code `TextField` with `<CodeCells value={code} onChange={setCode} onComplete={submit} />`. Keep `handleCodeSubmit` and the `signIn('email-code', { email, code, callbackUrl })` call exactly as they are.
- **Adaptive framing:** when `boundEmail` is set, render the card treatment — heading "We stamped your card", subcopy "the code's in your inbox — it's from a neighbor's library, so check Primary, not Promotions", a masked locked-address chip using the existing `maskEmail(boundEmail)`, and a reassurance line "No passwords here — your inbox is your key." When `boundEmail` is null, keep the current warm-neutral "Enter your code" heading and the existing explanatory line. A single boolean (`boundEmail != null`) selects the copy; the `CodeCells` input is identical in both.
- **Resend countdown:** the existing resend action becomes disabled after a send, showing a live "Re-stamp in M:SS" countdown (start ~45s), re-enabling at zero. A small `useCountdown`-style local timer; no new dependency.

### 3. Sign your card — `ProfileStep1` + `CommunityAgreements` (`src/components/profile-wizard/`)

- Replace `CommunityAgreements` (the 5 checkboxes) with the sign-your-card treatment inside `ProfileStep1`:
  - A rendered **library-card visual** (branch/library context if available, today's date) with the **name field as the signature line** on the card — the same `register('name')` field, styled as a signature. This is the only name input.
  - The **4 guidelines as a short readable list** (household-goods-only; care & trust; kindness/respect; no age-restricted items incl. firearms) — plain text, not checkboxes.
  - **One promise checkbox** mapping to `agreedToTerms`, labelled "I'll take care of the stuff I borrow, and won't lend anything irreplaceable," followed by a "Covers the house rules & terms" line that links the existing `/terms` and `/privacy` pages (as `CommunityAgreements` does today) with the current version label shown.
- **Gating:** `canSubmitMinimal` (`minimalEntry.ts`) becomes `name (non-empty) && agreedToTerms`. The 4 guideline boolean fields are removed from `ProfileFormData` and `minimalEntry.ts` (they were never persisted and gate nothing server-side). `ProfileStep1`'s `watch`/`canStart` follow suit.
- The two CTAs ("Get started" minimal, "Add a photo & address now") and the minimal-vs-full branching are unchanged. `ProfileStep2`/`ProfileStep3` (photo, address) are untouched.

## Error / edge handling

- **No `boundEmail`** (plain sign-in, join-code guest) → neutral code copy; no masked-address chip. `CodeCells` behaves identically.
- **Paste of a wrong-length or non-numeric string** → `CodeCells` fills what it can (digits only, up to `length`), never throws; submit stays gated on 6 filled digits.
- **Resend during countdown** → the action is disabled, so no double-send; the timer is the only control.
- **`agreedToTerms` false** → profile API still rejects (unchanged); no `agreedToTermsAt`/`termsVersion` written.
- **Existing users with null `termsVersion`** → unaffected; the column backfills only when they next sign the promise. No backfill migration.

## Testing

**`CodeCells`** (`src/components/__tests__/CodeCells.test.tsx`): typing a digit advances focus and updates value; backspace on empty retreats; pasting "508213" fills all six and calls `onComplete('508213')`; non-digits ignored; `onComplete` fires only at 6 digits.

**signin** (extend `src/app/auth/signin/__tests__/page.test.tsx`): with a bound invite (`/api/invite/context` returns an email) the stamp heading + masked address render; without one, the neutral heading renders and no masked chip; resend disables and shows a countdown after sending.

**sign-your-card** (`ProfileStep1`/agreements tests): the one promise gates submit — `canSubmitMinimal` true with name + promise, false missing either; the 4 guidelines render as text; House Rules + Terms links present; no 4 separate checkboxes.

**profile API** (`src/app/api/profile/__tests__/route.test.ts`): `termsVersion` is written = `CURRENT_TERMS_VERSION` with `agreedToTermsAt` when `agreedToTerms` is true (minimal and full paths); neither is written when false.

## Out of scope

The arrival screen ("Welcome in" + MEMBER stamp, people unmask) — sub-project D. Sender funnel — E. Recovery/"have a code?" — F. Any change to the minimal-vs-full onboarding branching, the photo/address steps, or the consume/membership sequencing (all already correct). Rewriting the actual `/terms` or house-rules page _content_ — this only adds a version label and links to what exists.

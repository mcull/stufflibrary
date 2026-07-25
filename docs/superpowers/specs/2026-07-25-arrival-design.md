# The arrival — "you're inside" + the host is told

**Date:** 2026-07-25
**Source:** "Invite Flow Redesign" dossier (claude.ai/design `b1e5907c-6dae-4a64-b6ae-90d68dffdfb8`), Section C screen 5 ("INSIDE"), and `docs/product/InviteFlows.md` §6 (the "no memberships yet" ending, Finding 5).
**Sub-project:** D of the invite-flow redesign tier. B (guest preview, #508), A (invite email, #509), and C (onboarding ceremony, #510) precede it. Remaining after D: E sender funnel, F recovery, G flyer steward. Decomposition tracked in memory `stufflibrary-invite-flow-redesign`.

## Why

The worst screen a new neighbor could land on was "No memberships yet" (Finding 5). PR #503 fixed the routing — a joiner now lands on `/library/{id}`, never `/home`. But the _arrival_ is still a plain success Alert ("Welcome to {library}, {name}! 🎉"), and the host learns nothing when someone joins. This sub-project makes the arrival feel like being handed a stamped card, and tells the neighbor who vouched: "say hi."

## Two things already done (no work here)

1. **Lands on `/library/{id}` every time**, never `/home` — since #503 (consume/join redirects carry `?message=joined_successfully`).
2. **People unmask on join** — the member API already returns the full member list to a member, so the front-porch privacy promise pays off automatically once the role flips. No change.

So D is two units: the **host notification** (backend) and the **arrival welcome restyle** (frontend).

## Decisions (from brainstorming)

1. **Recipient:** the inviter if known — a bound invite → the invitation's **sender** (the neighbor who vouched); a join-code/flyer → the library **owner**. In-app only (no email).
2. **Firing point:** from inside the two attributed-join markers in `src/lib/invite.ts` — `acceptInvitation` (bound) and `attributeJoinCode` (code) — so every join path (front-porch consume, direct invite click, join API, pending-panel accept) is covered by editing two functions. Fires on a genuine new join **and on a rejoin** (a lapsed member returning) — those functions are only ever called on a real attributed join.
3. **Arrival verbs:** both "Browse the shelves" and "Add your first thing"; the latter routes to the existing add-item flow, which already handles the lending-capability prompt for a fresh minimal-profile member.

## Architecture

Three units.

### 1. Data — the notification type

Add `MEMBER_JOINED` to the `NotificationType` enum in `prisma/schema.prisma` (the enum has `LIBRARY_INVITATION` but nothing for "someone joined"). Prisma migration; no data backfill.

### 2. Host notification — `src/lib/invite.ts` + notification service

A helper `notifyMemberJoined({ collectionId, newMemberId, recipientId })`:

- Resolves the new member's display name and the library name.
- Skips entirely when `recipientId` is falsy or equals `newMemberId` (never notify yourself; a bound invite's sender is never the joiner).
- Creates a `MEMBER_JOINED` notification for `recipientId` via the existing `createNotification` (which already dedupes within a window): message like "**{first name} joined {library} — say hi**", linking to `/library/{collectionId}` (the members view, now showing the new neighbor) via the notification's existing link/metadata mechanism.
- **Best-effort:** the whole helper body is wrapped so a notification failure can never break or roll back the join (the join has already happened when it's called).

Wired into the two markers, which resolve the recipient:

- **`acceptInvitation(token, collectionId, userId)`** (bound invites): read the invitation's `senderId` (one `findFirst` on the token) → `recipientId = senderId`. Fire after the acceptance write.
- **`attributeJoinCode(userId, collectionId, codeId)`** (join codes / flyers): read the collection's `ownerId` → `recipientId = ownerId`. Fire after attribution.

Both functions are pure-ish DB helpers today; the notification call is appended as a best-effort side effect at the end so their existing behavior and tests are unaffected on the happy path.

### 3. The arrival welcome — `src/components/CollectionDetailClient.tsx`

Restyle the existing `joined_successfully` welcome banner (driven by `showWelcomeBanner` / `currentUserName`) into the dossier's "INSIDE" moment:

- "**Welcome in, {name}**" with a **MEMBER stamp** (library-card fiction, echoing the front porch / sign-your-card brand), dismissible (the existing close affordance stays).
- **Two verbs:** "Browse the shelves" (dismisses the banner / stays on the page) and "Add your first thing" → the existing add-item route (`/add-item` or the library's add flow — match the current app route), which already prompts to finish the profile when lending is gated. No new capability logic here.
- Keep the existing URL-param cleanup (strip `message`/`welcomeName`) and the owner/already-member info-banner branches unchanged.

## Error / edge handling

- **Notification failure** (db error, missing user) → swallowed; the join succeeds regardless.
- **Recipient == joiner** (shouldn't happen — the owner joining gets no member row; a sender never joins their own invite) → no notification.
- **Owner joins their own library** → `ensureActiveMembership` returns `owner`, so neither marker fires; no notification.
- **Rejoin** (reactivated membership) → notifies, by design.
- **No `welcomeName` in the URL** → the banner falls back to a name-less "Welcome in" (as the current banner already tolerates a missing name).

## Testing

**`notifyMemberJoined` / the markers** (`src/lib/__tests__/invite.test.ts` or a focused file):

- `acceptInvitation` creates a `MEMBER_JOINED` notification for the invitation's **sender**, with the library link, on a real accept.
- `attributeJoinCode` creates one for the library **owner**.
- No notification when the resolved recipient equals the new member.
- Best-effort: a thrown `createNotification` does not propagate out of `acceptInvitation`/`attributeJoinCode` (the join still completes).

**Arrival banner** (`CollectionDetailClient` test): with `message=joined_successfully` + `welcomeName`, the banner renders "Welcome in, {name}" + the MEMBER stamp + both verbs; "Add your first thing" links to the add-item route; dismiss hides it.

**Migration:** the `MEMBER_JOINED` enum value exists (schema + generated client).

## Out of scope

The notification bell/list UI (already exists — this only adds a new type it renders). Email notifications. The sender-side funnel — opened/joined per invite, cancel, resend — sub-project E. Any change to the post-join routing or member-unmasking (already correct). The `LIBRARY_INVITATION` notification (a separate, existing type for being invited).

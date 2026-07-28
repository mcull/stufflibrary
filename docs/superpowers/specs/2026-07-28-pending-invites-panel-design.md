# Sub-project #504 — the invitee's pending-invites panel

**Date:** 2026-07-28
**Series:** Invite-flow redesign. B/A/C/D merged (#508–#511); F (recovery "have a code?", #512) and E (sender funnel, #513) now **merged to `main`**. This is the invitee-facing counterpart: a signed-in member's in-app view of libraries they've been invited to but haven't joined.
**Grounded in:** GitHub issue #504 and `docs/product/InviteFlows.md` §6.8.

## Problem

A member who was invited by email — but signed in some other way, or clicked their link and browsed the guest preview without claiming — has **no in-app way to see or accept that invitation**. The invite sits `PENDING`/`SENT` against their email with nothing surfacing it once they're inside the app.

The one component built for this, `InvitedBranchesSection` (`src/components/InvitedLibrariesSection.tsx`), is **orphaned and stale**:

- Mounted nowhere (referenced by no file).
- Reads `invitation.branch.*`, but `GET /api/invitations/pending` returns `invitation.collection.*` — so it would throw on render.
- Reads `data.branch.id` on accept, but `POST /api/invitations/[token]/accept` returns `data.library.id`.
- Uses dead "Branch" vocabulary and a generic yellow MUI card that predates the current **member-home** look (the `GreetingDesk` → `LibraryDrawer` → folder-card system in `LobbyClient`) and the invite-flow's library-card voice.

So #504 is a **rebuild to fit**, not a remount.

## Scope

**In:**

- An "above-the-drawer" band on the lobby (`/home`) that lists the signed-in user's pending **library** invitations and lets them **claim one in a click**, landing on the arrival screen (D's `ArrivalWelcome`).
- Renders nothing when there are no pending invitations (the common case leaves the lobby untouched).
- Delete the orphaned `InvitedLibrariesSection.tsx`.

**Out (YAGNI / already done elsewhere):**

- No change to `GET /api/invitations/pending` — it is already correct (filters `type:'library'`, status `PENDING`/`SENT`, non-expired, and excludes libraries the user already belongs to).
- No change to `POST /api/invitations/[token]/accept` — it already returns `{ library, user:{ firstName } }` and fires D's `notifyMemberJoined` via `acceptInvitation`.
- No decline/dismiss control (not requested; expired cards drop off on their own).
- No cross-tab badge/notification count.
- No overlap work with F's `JoinCodeEntry` — both already live on `main` and coexist (see Placement).

## Placement

`LobbyClient` today: `GreetingDesk`, then `LibraryDrawer` (tabs `LIBRARIES` / `MY STUFF`). Inside the `LIBRARIES` tab: "LIBRARIES I STARTED", "LIBRARIES I'VE JOINED", then F's `JoinCodeEntry` at the bottom.

The invitations band mounts **between `GreetingDesk` and `LibraryDrawer`** — above the drawer, so it is:

- **Always visible** regardless of active tab (an invitation expires; it must not hide behind `MY STUFF`).
- A clear top-priority **action item**, distinct from the two lower-key affordances it complements: personal invites surface here automatically; F's "Have a code?" door (bearer flyer/SMS codes) stays at the bottom of the `LIBRARIES` tab.
- **Absent entirely** when there are no pending invitations.

## Architecture & components

Four small units following the member-home pattern (`useCollections`/`useUserItems`, `member-home/*`):

- **`src/hooks/usePendingInvitations.ts`** — mirrors `useCollections`. Fetches `GET /api/invitations/pending`; returns `{ invitations, isLoading, error, refetch }`. Sole responsibility: own the data.
- **`src/components/member-home/InvitedLibraries.tsx`** — the band. Returns `null` while loading-with-nothing or when there are zero invites. Otherwise: a `DrawerSectionLabel`-style header + one card per invite. Owns the **claim** handler: `POST /api/invitations/[token]/accept` → on ok, `window.location` redirect to `/library/{data.library.id}?message=joined_successfully&welcomeName={data.user.firstName}` (lands on `ArrivalWelcome`); on failure, an inline error + `refetch()`.
- **`src/components/member-home/InvitedLibraryCard.tsx`** — one invitation, presentational: library name (Merriweather / ink-blue), an "Invited by {inviter} · {N} members" line, a muted "Card expires {date}", and a **Claim your card** button with a per-card in-flight spinner keyed by token.
- **`LobbyClient.tsx`** — mount `<InvitedLibraries />` between `<GreetingDesk />` and `<LibraryDrawer />`. Separately, delete the orphaned `src/components/InvitedLibrariesSection.tsx` (nothing imports it).

**Claim is one click straight to the arrival.** The user is already signed in and the invite matches their email, so claiming goes directly to accept → arrival — no guest-preview detour (that screen is for signed-out browsing; the lobby card already shows name/inviter/member count).

## Copy / voice (library-card fiction)

- Section label adapts to count: **"A LIBRARY CARD IS WAITING"** (one) / **"LIBRARY CARDS WAITING FOR YOU"** (more than one).
- Per card: **{Library name}** · "Invited by {inviter} · {N} members" · "Card expires {date}" · button **Claim your card**.
- Clear where it counts (who invited you), in-fiction where it delights (the card is waiting; you claim it) — never winking at the fiction.

## Data flow

```
Lobby mounts → usePendingInvitations → GET /api/invitations/pending
  → { invitations: [{ id, token, collection:{ id, name, location, owner, memberCount },
                      invitedBy:{ name, email }, createdAt, expiresAt }] }
InvitedLibraries renders one InvitedLibraryCard per invite (nothing if none)
Claim(token) → POST /api/invitations/[token]/accept
  → ok:   redirect /library/{library.id}?message=joined_successfully&welcomeName={firstName}
          (ArrivalWelcome banner)
  → fail: inline error on the band + refetch() (a since-expired card drops off)
```

## Error handling

Expired invites never appear (the API filters them); email-mismatch cannot happen (the API filters to the user's own email). The only live failures are a race (the invite expires between load and click → the accept route returns 400) or a network blip. Both show an inline error on the band and `refetch()` to resync. A failed claim **never** removes a card optimistically.

## Testing (TDD)

- **`usePendingInvitations`:** returns the API's `invitations`; surfaces an error on a non-ok response.
- **`InvitedLibraries`:** renders one card per invite from the real API shape; renders `null` when there are none; **Claim** POSTs to `/api/invitations/{token}/accept` and redirects to the arrival URL built from the returned `library.id` + `welcomeName`; a failed claim shows an inline error and keeps the card.
- **`InvitedLibraryCard`:** shows name / "Invited by …" / member count / expiry / button; the spinner disables only its own button.
- **`LobbyClient`:** `InvitedLibraries` is mounted above the drawer (light smoke test).
- Full `npm run test:unit` before the PR.

## File inventory

- **New:** `src/hooks/usePendingInvitations.ts`, `src/components/member-home/InvitedLibraries.tsx`, `src/components/member-home/InvitedLibraryCard.tsx`, and their tests.
- **Modify:** `src/components/LobbyClient.tsx` (mount the band).
- **Delete:** `src/components/InvitedLibrariesSection.tsx` (orphaned, stale).
- **Unchanged (verified correct):** `src/app/api/invitations/pending/route.ts`, `src/app/api/invitations/[token]/accept/route.ts`.

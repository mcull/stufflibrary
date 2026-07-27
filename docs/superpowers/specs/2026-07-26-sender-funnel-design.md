# Sub-project E — sender-side funnel (opened-tracking + resend)

**Date:** 2026-07-26
**Series:** Invite-flow redesign (follows B/A/C/D merged as #508/#509/#510/#511, and F — recovery "have a code?" — PR #512 open).
**Grounded in:** the dossier's Finding 6 / `docs/product/InviteFlows.md` §6.7 — the host has no visibility into an invitation after sending it.

## Problem

A host sends a personal invitation and then the trail goes cold. The pending list in
`ManageMembersModal` shows each invitee's email, a Sent/Created date, and a status chip
(Pending/Sent/Accepted/Expired) — but nothing about whether the invitee ever _looked_, and no way
to nudge them. The funnel has a hole in the middle: "sent" and "joined" are recorded, "opened" is
not. `CANCELLED`/`DECLINED` exist in the enum but nothing writes them; there is no "opened" signal
at all.

(Note: the old note about share links polluting this list with synthetic
`link-…@share.stufflibrary.local` emails is **already resolved** — share links became `JoinCode`s,
and the invitations list only queries `type: 'library'`, so they never appear here. Labeling share
links by placement belongs to sub-project G.)

## Scope

**In:**

- An **"opened" signal** on personal invitations — recorded when the invitee views the library via
  their invite link.
- Surface it in the pending list as a compact inline funnel step (Sent · Opened / not-opened-yet),
  keeping the existing terminal status chip.
- A per-invite **Resend** control.

**Out (YAGNI / other sub-projects):**

- Cancel / revoke (CANCELLED) — not requested for E.
- DECLINED (invitee-initiated) — not requested.
- Full timeline redesign — the compact inline form is enough.
- Email open-pixel tracking — unreliable; rejected in favor of the link-land signal.
- #504's invitee-side pending panel — separate, invitee-facing, not part of E.
- Share-link placement labels — sub-project G.

## Approach

Two small, cohesive changes around one goal (host visibility + a nudge):

### 1. The "opened" signal — "viewed the library"

"Opened" means the invitee clicked their invite link and landed on the guest preview — a real,
reliable, server-side signal ("they saw the library"), with no email pixel and no privacy tradeoff.

- **Schema:** add `openedAt DateTime?` to `Invitation` (nullable → additive, safe migration).
- **Hook:** in `handleInviteLanding` (`src/lib/invite.ts`), in the **signed-out guest-preview
  branch** (the canonical first-view moment — post-F, invitees are signed out when they click),
  best-effort stamp:
  ```ts
  await db.invitation.updateMany({
    where: { token, openedAt: null },
    data: { openedAt: new Date() },
  });
  ```
  Keyed by `token` (the value `handleInviteLanding` already has), `openedAt: null` in the WHERE so
  the **first** view wins and a re-view never moves it. Wrapped so a failure never breaks the
  landing (an outage must not cost the invitee their front porch). Join codes are untouched —
  opened-tracking is invitation-only; per-recipient flyer tracking is sub-project G.
- **Display rule:** a join implies a view, so the UI treats a set `acceptedAt` as implying opened.
  This covers the rare signed-in fast-join that skips the guest preview (opened stays null but the
  row shows Joined), so the funnel never reads as "joined but never opened."

### 2. The pending list (`ManageMembersModal`)

- Add `openedAt: string | null` to the component's `Invitation` interface.
- Each pending row's secondary text gains a compact funnel: `Sent <date>` plus, on its own line,
  either `Opened <date>` (when `openedAt` is set **or** the invite is accepted) or a muted
  `Not opened yet`. The existing terminal status chip (Accepted/Expired/Pending/Sent) stays.
- A **Resend** button per row, shown for invites that are not `ACCEPTED` (and not, in future,
  CANCELLED). It re-fires the invite email.

### 3. Resend — reuse the invite endpoint

The Resend button calls the existing `POST /api/collections/[id]/invite` with
`{ email: invitation.email }` (mode defaults to `email`). That route already does exactly what a
resend needs:

- a **live** invite (PENDING/SENT, unexpired) keeps its `token`/`shortCode` — the link already in
  the inbox stays valid — re-sends the email, and refreshes `status: SENT` + `sentAt`;
- an **expired/consumed** invite heals with a fresh token/code and re-sends.

So no new endpoint and no duplicated email-send logic; the existing re-invite tests already cover
the route's behavior. The button handler mirrors the existing send handler (POST → on success,
`loadData()` to refresh the list). Deliberate trade-offs: the original personal note is not
re-attached (a resend is a nudge, not a fresh personalized invite), and it runs through the same
per-hour rate limit (unlimited in beta).

## API

- `GET /api/collections/[id]/invitations` — add `openedAt: invitation.openedAt` to the transformed
  response object (one line). No other API changes; resend reuses the invite POST.

## Data flow

```
Host sends invite ──> Invitation {status: SENT, sentAt}
Invitee clicks /join/<shortCode>
  └─ /join/[code] route ─> resolves shortCode ─> handleInviteLanding(token)
       └─ signed-out guest-preview branch ─> stamp openedAt (first time)  ─> /library/[id]?guest=1
Invitee claims card, signs in, joins ──> acceptInvitation ─> {status: ACCEPTED, acceptedAt}

Host opens ManageMembersModal ─> GET .../invitations (now includes openedAt)
  └─ each row: Sent <date> · Opened <date>|Not opened yet + status chip + [Resend]
Host clicks Resend ─> POST .../invite {email} ─> re-send ─> loadData()
```

## Testing

- **`handleInviteLanding` / opened-tracking** (`src/lib/__tests__/invite.test.ts`): stamps
  `openedAt` via `updateMany({ where: { token, openedAt: null } })` on the signed-out guest-preview
  landing; the WHERE's `openedAt: null` guards against overwriting an earlier view; a thrown
  `updateMany` does not break the landing (still redirects to the guest preview).
- **List API** (`src/app/api/collections/[id]/invitations/__tests__/`): the transformed response
  includes `openedAt`.
- **`ManageMembersModal`** (`src/components/__tests__/`): a row with `openedAt` set shows
  `Opened …`; a row without shows `Not opened yet`; an accepted row reads as opened; the **Resend**
  button POSTs `/api/collections/[id]/invite` with the row's email and reloads the list; Resend is
  hidden for accepted invites.
- Full `npm run test:unit` before the PR (the shared-helper gate — `handleInviteLanding` is shared).

## File inventory

- Modify: `prisma/schema.prisma` (+ new migration under `prisma/migrations/`) — `openedAt` column.
- Modify: `src/lib/invite.ts` — stamp `openedAt` in `handleInviteLanding`'s guest-preview branch.
- Modify: `src/app/api/collections/[id]/invitations/route.ts` — expose `openedAt`.
- Modify: `src/components/ManageMembersModal.tsx` — `Invitation` type, funnel line, Resend button.
- Tests: `src/lib/__tests__/invite.test.ts`, invitations-list route test,
  `src/components/__tests__/ManageMembersModal.*.test.tsx`.

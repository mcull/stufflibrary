# Sub-project F — "Have a code?" recovery entry

**Date:** 2026-07-26
**Series:** Invite-flow redesign (follows B/A/C/D — PRs #508/#509/#510/#511, all merged).
**Grounded in:** `docs/product/InviteFlows.md` §6.4 (cross-device handoff has "no designed
story at all") and the dossier's recovery finding.

## Problem

Someone holding a short join code — off a corkboard flyer, a forwarded text, an SMS — has
nowhere in the product to _type it_. The printed front door `/join/<code>` works if they follow
the full URL, but:

- A **signed-in member** who receives a code for a _new_ library has no in-app way to redeem it.
  This is the main gap: the lobby offers "start a library" and shows libraries you're already in,
  but no "join another with a code."
- A **signed-out person** on the sign-in screen has only the email door. If they hold a code, the
  browse-first guest preview (the intended "front porch") is unreachable from there.
- **Cross-device** ("start on the phone from a flyer, finish on the laptop") has no designed
  story — §6.4 notes the typable code is the "only accidental mitigation."

## Insight

The plumbing already exists. `GET /join/[code]` (`src/app/join/[code]/route.ts`) resolves both
`JoinCode.code` and `Invitation.shortCode`, sets the invite cookie, and routes correctly:

- **signed out** → guest preview `/library/[id]?guest=1`
- **signed in** → auto-joins and redirects to `/library/[id]?message=joined_successfully`,
  which fires D's `ArrivalWelcome` banner
- **miss** → `/?invite=invalid`

F does **not** re-implement any of that. It gives that route a _door you can type into_, on two
surfaces, without ejecting anyone on a typo. The bearer code re-resolves fresh on any device, so
the same entry field is also the cross-device handoff — no cookie transfer needed.

## Scope

**In:**

- Signed-in lobby (`/home` → `LobbyClient`) — the primary redemption path.
- Sign-in screen (`/auth/signin`) — the signed-out door to the guest preview.
- A small resolve-only endpoint so a bad code shows an inline error instead of bouncing a
  signed-in member out of their lobby to `/?invite=invalid`.

**Out (YAGNI):**

- Public landing Hero (`/`) entry.
- Surfacing the code on the guest preview for transfer (would need threading the httpOnly
  cookie through — the entry field alone is the agreed cross-device story).
- Any "this code opens <Library>" confirm step — the `/join` navigation shows the library
  immediately, so a name confirmation is redundant.
- SMS.

## Approach

Chosen interaction: **progressive disclosure**. One shared `JoinCodeEntry` client component
shows a quiet "Have a code?" affordance that reveals a text field + Join button on tap. Uniform
across both surfaces, keeps them uncluttered, discoverable enough. (Rejected: always-visible
field — clutters the email-first sign-in door; a dedicated `/join` entry page — extra page + a
navigation hop for one field.)

## Components & data flow

### 1. `POST /api/join/resolve` (new) — resolve-only, no redirect

- **Method/shape:** `POST` with JSON body `{ code: string }`. POST-with-body (not code-in-path)
  keeps the bearer code out of server access logs.
- **Throttle first:** consult `isJoinLookupBlocked(ip)` (from `join-code-rate-limit.ts`) BEFORE
  any lookup → `429` if over budget. This endpoint **must** share the same IP throttle as
  `/join`, or it becomes a clean JSON enumeration oracle that `/join` is not. IP is read from
  `x-forwarded-for` (first hop) / `x-real-ip`, mirroring the `clientIp` helper in the `/join`
  route.
- **Resolve:** `normalizeJoinCode(code)` (server-side), then `resolveJoinCode(normalized)`
  (join-code-service.ts); on null, fall through to `db.invitation.findFirst({ where: { shortCode:
normalized } })`.
- **Result:**
  - a hit → `{ ok: true }` (do **not** record a failure).
  - a miss → `recordJoinLookupFailure(ip)` then `{ ok: false }`.
- Leaks exactly the one bit (`ok`) that `/join`'s redirect target already leaks — no library
  name, no distinction between "join code" and "invitation shortCode."

### 2. `JoinCodeEntry` (new client component)

- Quiet "Have a code?" affordance → reveals a `type="text"` input (distinct from the sign-in
  page's `input[type="email"]` and the 6-cell auth code, so no selector/e2e clash) + a Join
  button.
- Sends the **raw typed value** to `/api/join/resolve` (server normalizes), so the component
  never imports `join-code.ts` and never drags node `crypto` into the client bundle.
- On response:
  - `{ ok: true }` → `window.location.href = '/join/' + encodeURIComponent(trimmedCode)`. The
    existing route does the real join (signed in) or guest preview (signed out).
  - `{ ok: false }` → inline "That code didn't match — check for typos." Field keeps focus.
    **No navigation** — a signed-in member stays in their lobby.
  - `429` → "Too many tries — give it a minute."
  - network/5xx → a generic "Something went wrong — try again."
- Voice: stays inside the fiction (library-card language); "Have a code?" / "Join." No winking.

### 3. Mounts

- `src/components/LobbyClient.tsx` — in the "libraries" tab, under the "LIBRARIES I'VE JOINED"
  section.
- `src/app/auth/signin/page.tsx` — on the email step, below the "Continue" button (not on the
  code step).

## Error handling summary

| Case                        | Endpoint                               | Component                       |
| --------------------------- | -------------------------------------- | ------------------------------- |
| Valid join code / shortCode | `{ ok: true }`, no failure recorded    | navigate to `/join/<code>`      |
| Unknown code                | records failure, `{ ok: false }`       | inline "didn't match," stay put |
| Over IP throttle            | `429` before any lookup                | "too many tries" message        |
| Backend error               | `500` (does not spend throttle budget) | generic retry message           |

## Testing

- **Resolve route** (`src/app/api/join/resolve/__tests__/route.test.ts`): valid join code; valid
  invitation shortCode; miss → `{ok:false}` + `recordJoinLookupFailure` called; over-throttle →
  429 without lookups; normalization applied (lowercase / hyphen / `O`→`0`).
- **`JoinCodeEntry`** component test: reveal on click; valid → triggers navigation; invalid →
  inline error + no navigation; 429 → throttle message. Mock `fetch` and `window.location`.
- Run full `npm run test:unit` before the PR — the shared-helper gotcha (a change reachable by a
  sequenced `mockResolvedValueOnce` chain in another dir) is caught only by the full suite.
- The new sign-in field is additive and uses `type="text"`, so the `auth-code-flow.spec.ts` e2e
  (which drives `input[type="email"]` and the `Digit N of 6` cells) is unaffected. No e2e change
  expected.

## File inventory

- New: `src/app/api/join/resolve/route.ts`
- New: `src/app/api/join/resolve/__tests__/route.test.ts`
- New: `src/components/JoinCodeEntry.tsx`
- New: `src/components/__tests__/JoinCodeEntry.test.tsx`
- Edit: `src/components/LobbyClient.tsx` (mount)
- Edit: `src/app/auth/signin/page.tsx` (mount)

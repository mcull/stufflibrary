# Front Porch — guest-preview redesign

**Date:** 2026-07-22
**Source:** "Invite Flow Redesign" dossier (claude.ai/design `b1e5907c-6dae-4a64-b6ae-90d68dffdfb8`), Section C Screen 2 ("The Front Porch"), and `docs/product/InviteFlows.md` §6.1.
**Sub-project:** B of the invite-flow redesign tier. Decomposition and the other sub-projects (A email, C onboarding ceremony, D arrival, E sender funnel, F recovery, G flyer steward) are tracked in memory `stufflibrary-invite-flow-redesign` and get their own spec→plan→build cycles.
**Prereq shipped:** PR #503 already routes signed-out personal invitees to the guest preview (`/library/[id]?guest=1`). This sub-project restyles that preview into the front porch.

## Why

The guest preview today treats every visitor identically — a generic "Welcome! Check this out 👋" banner, a privacy note, and a "Ready to join? It's easy" checklist. It never names who invited them or frames the visit as a personal invitation, which the dossier identifies (§6.1) as the strongest trust signal going unused. The front porch answers "why would I want in?" before asking for anything.

## Decisions (from brainstorming)

1. **People visibility:** the porch may show the inviter's (or host's) **first name only** and a bare member **count**. No other names, avatars, or locations. The #497 guest redaction (owner `null`, members blurred/counted) is otherwise untouched.
2. **Bearer (join-code) guests:** greeted with the library owner named as host ("hosted by Marc"), since there is no single inviter.
3. **Aesthetic:** translate the dossier into the app's own brand system (`inkBlue`/`warmCream`/`mustardYellow`/`tomatoRed`, Merriweather/Roboto Mono/Inter), reusing `VintageCheckoutCard` motifs — not the dossier's decorative fonts/hexes.
4. **CTA boundary:** the CTA becomes "Claim your library card" and the block is rebranded, but clicking still runs today's `joinLibrary()` → signin → existing wizard. The photo/address deferral is sub-project C; the guest copy stays honest about the current flow.
5. **"Front porch" is internal only.** It is a design metaphor from the dossier, not a library term. It must never appear in user-facing copy — and to keep it from leaking through the code, the component and its symbols are named for what they are (`GuestPreview`), not the metaphor. User-facing vocabulary stays inside the library-card fiction (invited, card, shelf, member).

## Architecture

Two layers, both small and view-only in effect.

### Data layer — `src/app/api/collections/[id]/route.ts`

Add one guest-only response field, `invitationContext`:

```ts
invitationContext:
  | { kind: 'personal'; inviterName: string | null }  // bound invite: sender's first name
  | { kind: 'code'; inviterName: string | null }       // join code: owner's first name (host)
  | null                                               // members/owners, or no resolvable context
```

- **Bound invite guest:** the existing invite lookup (currently `select: { id: true }` at ~line 135) widens to `select: { id: true, sender: { select: { name: true } } }`; `inviterName` = first token of `sender.name` (or `null`).
- **Join-code guest:** `kind: 'code'`, `inviterName` = first token of the already-loaded `library.owner.name`.
- **Non-guest / unresolved:** `null`.
- **Privacy:** only the first name is exposed — never id, image, or address. `owner` stays `null` for guests, members stay redacted, `memberCount` is unchanged. `invitationContext` is computed only when `effectiveRole === 'guest'`; it is `null` for members/owners/admins.

`memberCount` already exists in the response (`libraryMemberCount` = active members including the owner, counted once). The porch consumes it as-is.

### Presentation layer — `src/components/GuestPreview.tsx` (new)

`CollectionDetailClient` renders `<GuestPreview>` only when `library.userRole === 'guest'`, **replacing** the three current guest-only blocks:

- the top "Welcome! Check this out 👋" banner (~L744),
- the mid "We keep member details private until you join" note (~L1354),
- the bottom "Ready to join? It's easy" block with the "Sign me up!" button (~L1696).

Consolidating three scattered blocks into one component gives the porch a single responsibility and stops the ~1900-line `CollectionDetailClient` from growing further. The component takes props for what it renders and a callback for the action — it owns no data fetching:

```ts
interface GuestPreviewProps {
  slot: 'header' | 'claim';
  libraryName: string;
  invitationContext:
    | { kind: 'personal'; inviterName: string | null }
    | { kind: 'code'; inviterName: string | null }
    | null;
  memberCount: number;
  onClaim: () => void; // wired to the existing joinLibrary()
}
```

The item grid and map already render between the header and the claim block in `CollectionDetailClient`, so the component renders in two slots rather than wrapping the grid: `slot='header'` at the top (replacing the welcome banner + privacy note) and `slot='claim'` at the bottom (replacing the join block). This keeps the existing grid/map JSX in place, untouched.

**`slot='header'`** renders:

- Inviter line — personal: "**{inviterName}** invited you to **{libraryName}**"; code: "**{libraryName}** — hosted by **{inviterName}**"; when `invitationContext` is `null` or `inviterName` is `null`: library name alone ("Welcome to **{libraryName}**"). Merriweather hero + Roboto Mono label, `inkBlue` on `warmCream`.
- House-rule-1 privacy promise: "The stuff is public to invited guests. The people aren't — names and faces stay members-only." + a count line: "**{memberCount}** {memberCount === 1 ? 'member shares' : 'members share'} this shelf · you'll meet them once you join." (Total-count phrasing — always correct regardless of whether the inviter is the owner; deliberately not the dossier's fragile "Marc + N" arithmetic.)

**`slot='claim'`** renders:

- A `VintageCheckoutCard`-styled panel with CTA **"Claim your library card"** calling `onClaim()` (= `joinLibrary()`), plus one honest sub-line about the current flow ("Free · takes a minute").

### Behavior & invariants — unchanged

`joinLibrary()`, the localStorage invite-token backup, the auth redirect, the map redaction, and the item grid all stay exactly as they are. All seven invite invariants hold: the porch grants nothing, exposes only a first name and a count already implied by the library existing, and touches no server binding check.

## Error / edge handling

- `invitationContext === null` (guest cookie validated but context unresolved) → header falls back to "Welcome to {libraryName}", no inviter line. No crash, no empty "invited you to".
- `inviterName === null` (member/owner with no name set) → same fallback.
- A signed-in member/owner never sees the porch (`userRole` gates it); `invitationContext` is `null` for them anyway.

## Testing

**API unit tests** (`src/app/api/collections/[id]/__tests__/`, extending existing coverage):

- Bound-invite guest → `invitationContext.kind === 'personal'`, `inviterName` = sender's first name.
- Join-code guest → `invitationContext.kind === 'code'`, `inviterName` = owner's first name.
- Member/owner/admin → `invitationContext === null`.
- Leak guard: `invitationContext` carries no `image`, `address`, `email`, or `id`; `owner` is still `null` for guests; members still redacted.

**Component tests** (`src/components/__tests__/`):

- Personal header renders "{name} invited you to {library}"; code header renders "{library} — hosted by {name}"; null context renders "Welcome to {library}" with no inviter line.
- Count line: singular vs. plural; renders the `memberCount` value.
- Claim CTA calls `onClaim`.

## Out of scope

The onboarding ceremony (stamp / sign-your-card, photo-address deferral) — sub-project C. The invite email — A. Sender-side funnel — E. Any change to `joinLibrary`, the wizard, the map, or the item grid beyond removing the three replaced guest blocks.

# Guest-Preview Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the signed-out guest preview so it names who invited the visitor (or the host, for join codes), states the privacy promise as hospitality, and reframes the CTA as claiming a library card — the dossier's "front porch," translated into the app's brand system.

**Architecture:** One new read-only API field (`invitationContext`, first-name-only) on `GET /api/collections/[id]`, consumed by one new presentational component `GuestPreview` that `CollectionDetailClient` renders in two slots (header + claim), replacing three scattered guest-only blocks. No change to join behavior, the wizard, the map, or the item grid.

**Tech Stack:** Next.js App Router, Prisma, MUI, Vitest + @testing-library/react. Tests mock `@/lib/db` and `next-auth` with `vi.hoisted` mocks. Reuse existing helpers: `firstNameOnly` (`src/lib/member-location-privacy.ts`) and `brandColors`/`spacing` (`src/theme/brandTokens.ts`).

**Naming constraint (from the spec):** "front porch" is an internal design metaphor only. It must never appear in user-facing copy, component names, symbols, or props. The component is `GuestPreview`. User-facing words stay inside the library-card fiction (invited, card, shelf, member).

**Spec:** `docs/superpowers/specs/2026-07-22-front-porch-guest-preview-design.md`. **Branch:** `feat/front-porch-guest-preview` (already created off `main`, spec committed). Husky prints a deprecation warning on commit — ignore it. Commit messages get a one-line `Why:` trailer plus the `Co-Authored-By:` line.

---

### Task 1: Baseline

**Files:** none modified.

- [ ] **Step 1: Confirm branch**

Run: `git branch --show-current`
Expected: `feat/front-porch-guest-preview`

- [ ] **Step 2: Run the touched-area tests green as a baseline**

Run: `npx vitest run "src/app/api/collections/[id]/__tests__/"`
Expected: PASS (`route.joincode.test.ts`, `route.privacy.test.ts`). Note the counts; the API task must not regress them.

---

### Task 2: API — add `invitationContext` to the guest payload

**Files:**

- Test (create): `src/app/api/collections/[id]/__tests__/route.invitation-context.test.ts`
- Modify: `src/app/api/collections/[id]/route.ts` (guest-validation block ~L133-149 and the `formattedLibrary` object ~L280-300)

The route already resolves guest role from either a `jc:`-prefixed join-code cookie or a bound-invite token cookie, and already emits `memberCount`. This task captures a first-name-only `invitationContext` during that resolution and adds it to the response.

- [ ] **Step 1: Write the failing test**

Create `src/app/api/collections/[id]/__tests__/route.invitation-context.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockCollectionFindUnique = vi.hoisted(() => vi.fn());
const mockItemFindMany = vi.hoisted(() => vi.fn());
const mockInvitationFindFirst = vi.hoisted(() => vi.fn());
const mockJoinCodeFindFirst = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({
  db: {
    collection: { findUnique: mockCollectionFindUnique },
    item: { findMany: mockItemFindMany },
    invitation: { findFirst: mockInvitationFindFirst },
    joinCode: { findFirst: mockJoinCodeFindFirst },
  },
}));

import { GET } from '../route';

const LIBRARY_ID = 'lib_1';
const OWNER_ID = 'owner_1';
const CODE_ID = 'jc_1';

function library(overrides: Record<string, unknown> = {}) {
  return {
    id: LIBRARY_ID,
    name: 'Bernal Tools',
    description: null,
    location: 'Bernal Heights',
    isPublic: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    ownerId: OWNER_ID,
    inviteRateLimitPerHour: 0,
    owner: {
      id: OWNER_ID,
      name: 'Ada Owner',
      image: 'https://cdn.example/ada.png',
      status: 'active',
      addresses: [],
    },
    members: [
      {
        id: 'cm_1',
        userId: 'member_1',
        role: 'member',
        joinedAt: new Date('2026-01-03'),
        user: {
          id: 'member_1',
          name: 'Grace Member',
          image: null,
          status: 'active',
          addresses: [],
        },
      },
    ],
    _count: { members: 1 },
    ...overrides,
  };
}

function request(cookies: Record<string, string> = {}) {
  return {
    url: `http://t/api/collections/${LIBRARY_ID}`,
    cookies: {
      get: (name: string) =>
        cookies[name] === undefined ? undefined : { value: cookies[name] },
    },
  } as never;
}

async function callGET(cookies?: Record<string, string>) {
  const res = await GET(request(cookies), {
    params: Promise.resolve({ id: LIBRARY_ID }),
  });
  return { status: res.status, body: await res.json() };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockItemFindMany.mockResolvedValue([]);
  mockCollectionFindUnique.mockResolvedValue(library());
  mockInvitationFindFirst.mockResolvedValue(null);
});

describe('GET /api/collections/[id] — invitationContext', () => {
  it('gives a bound-invite guest the inviter first name', async () => {
    mockGetServerSession.mockResolvedValue(null);
    // The invite lookup must select the sender's name for this to resolve.
    mockInvitationFindFirst.mockResolvedValue({
      id: 'inv_1',
      sender: { name: 'Marc Cull' },
    });

    const { body } = await callGET({
      invite_token: 'tok_1',
      invite_library: LIBRARY_ID,
    });

    expect(body.collection.userRole).toBe('guest');
    expect(body.collection.invitationContext).toEqual({
      kind: 'personal',
      inviterName: 'Marc',
    });
  });

  it('gives a join-code guest the owner first name as host', async () => {
    mockGetServerSession.mockResolvedValue(null);
    mockJoinCodeFindFirst.mockResolvedValue({
      id: CODE_ID,
      collectionId: LIBRARY_ID,
      isActive: true,
    });

    const { body } = await callGET({
      invite_token: `jc:${CODE_ID}`,
      invite_library: LIBRARY_ID,
    });

    expect(body.collection.userRole).toBe('guest');
    expect(body.collection.invitationContext).toEqual({
      kind: 'code',
      inviterName: 'Ada',
    });
  });

  it('gives the owner no invitationContext', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: OWNER_ID } });

    const { body } = await callGET();

    expect(body.collection.userRole).toBe('owner');
    expect(body.collection.invitationContext).toBeNull();
  });

  it('leaks no identifiers beyond the first name', async () => {
    mockGetServerSession.mockResolvedValue(null);
    mockInvitationFindFirst.mockResolvedValue({
      id: 'inv_1',
      sender: { name: 'Marc Cull' },
    });

    const { body } = await callGET({
      invite_token: 'tok_1',
      invite_library: LIBRARY_ID,
    });

    const ctx = body.collection.invitationContext;
    expect(Object.keys(ctx).sort()).toEqual(['inviterName', 'kind']);
    expect(JSON.stringify(ctx)).not.toContain('Cull'); // surname dropped
    expect(body.collection.owner).toBeNull(); // #497 redaction intact
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run "src/app/api/collections/[id]/__tests__/route.invitation-context.test.ts"`
Expected: FAIL — `body.collection.invitationContext` is `undefined`.

- [ ] **Step 3: Import the first-name helper**

In `src/app/api/collections/[id]/route.ts`, add `firstNameOnly` to the existing import from `@/lib/member-location-privacy`. The current import is:

```ts
import {
  canSeeExactMemberLocations,
  type MemberArea,
} from '@/lib/member-location-privacy';
```

Change it to (verify the exact current members of this import before editing; add `firstNameOnly`, keep whatever else is there):

```ts
import {
  canSeeExactMemberLocations,
  firstNameOnly,
  type MemberArea,
} from '@/lib/member-location-privacy';
```

If `canSeeExactMemberLocations`/`MemberArea` are actually imported elsewhere, just ensure `firstNameOnly` is imported from `@/lib/member-location-privacy` exactly once.

- [ ] **Step 4: Capture the context during guest validation**

In `src/app/api/collections/[id]/route.ts`, the guest-validation block currently reads (around L113-150):

```ts
    let userRole = userId === library.ownerId ? 'owner' : null;
    // Validate invite token for guest role
    if (!userRole && inviteToken && inviteLibrary === libraryId) {
```

Add a context variable immediately above that `if`, and populate it inside each branch. Declare it right after the `userRole` line:

```ts
let invitationContext:
  | { kind: 'personal'; inviterName: string | null }
  | { kind: 'code'; inviterName: string | null }
  | null = null;
```

Then, in the join-code branch, where it currently sets the role:

```ts
if (resolved && resolved.collectionId === libraryId) {
  console.log('[collections/:id GET] join code valid -> guest role');
  userRole = 'guest' as any;
}
```

change it to also set the context (owner as host):

```ts
if (resolved && resolved.collectionId === libraryId) {
  console.log('[collections/:id GET] join code valid -> guest role');
  userRole = 'guest' as any;
  invitationContext = {
    kind: 'code',
    inviterName: firstNameOnly(library.owner.name),
  };
}
```

And widen the bound-invite lookup + set the personal context. The `else` branch currently reads:

```ts
      } else {
        console.log('[collections/:id GET] validating invite for guest role');
        const inv = await db.invitation.findFirst({
          where: {
            token: inviteToken,
            libraryId,
            type: 'library',
            status: { in: ['PENDING', 'SENT'] },
            expiresAt: { gt: new Date() },
          },
          select: { id: true },
        });
        if (inv) {
          console.log('[collections/:id GET] invite valid -> guest role');
          userRole = 'guest' as any;
        }
      }
```

change it to:

```ts
      } else {
        console.log('[collections/:id GET] validating invite for guest role');
        const inv = await db.invitation.findFirst({
          where: {
            token: inviteToken,
            libraryId,
            type: 'library',
            status: { in: ['PENDING', 'SENT'] },
            expiresAt: { gt: new Date() },
          },
          select: { id: true, sender: { select: { name: true } } },
        });
        if (inv) {
          console.log('[collections/:id GET] invite valid -> guest role');
          userRole = 'guest' as any;
          invitationContext = {
            kind: 'personal',
            inviterName: firstNameOnly(inv.sender?.name),
          };
        }
      }
```

- [ ] **Step 5: Emit the field on the response**

In the `formattedLibrary` object, add `invitationContext` next to `memberCount` (only guests ever have a non-null value, but gate it explicitly so a future role that reuses the variable can't leak it). After the `memberCount: libraryMemberCount({...}),` block, add:

```ts
      // Guests only: the inviter's (or host's) first name, nothing more.
      // Null for members/owners/admins.
      invitationContext: effectiveRole === 'guest' ? invitationContext : null,
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run "src/app/api/collections/[id]/__tests__/route.invitation-context.test.ts"`
Expected: PASS (4 tests).

- [ ] **Step 7: Run the sibling route tests to confirm no regression**

Run: `npx vitest run "src/app/api/collections/[id]/__tests__/"`
Expected: PASS (all three files).

- [ ] **Step 8: Commit**

```bash
git add "src/app/api/collections/[id]/route.ts" "src/app/api/collections/[id]/__tests__/route.invitation-context.test.ts"
git commit -m "feat(invites): expose guest invitationContext (inviter/host first name)

The guest payload now carries who invited the visitor — a bound
invite's sender, or the owner as host for a join code — first name
only, so the preview can name them. #497 redaction is otherwise intact.

Why: the guest preview never named who invited you; §6.1 calls that the strongest unused trust signal

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: The `GuestPreview` component

**Files:**

- Create: `src/components/GuestPreview.tsx`
- Test (create): `src/components/__tests__/GuestPreview.test.tsx`

A presentational component with no data fetching. It renders one of two slots — `header` or `claim` — so the existing item grid/map can stay between them in `CollectionDetailClient`.

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/GuestPreview.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { GuestPreview } from '../GuestPreview';

const base = {
  libraryName: 'HAASS',
  memberCount: 3,
  onClaim: () => {},
};

describe('GuestPreview — header slot', () => {
  it('names the inviter for a personal invite', () => {
    render(
      <GuestPreview
        slot="header"
        {...base}
        invitationContext={{ kind: 'personal', inviterName: 'Marc' }}
      />
    );
    expect(screen.getByText(/Marc invited you to/)).toBeInTheDocument();
    expect(screen.getByText(/HAASS/)).toBeInTheDocument();
  });

  it('names the host for a join code', () => {
    render(
      <GuestPreview
        slot="header"
        {...base}
        invitationContext={{ kind: 'code', inviterName: 'Marc' }}
      />
    );
    expect(screen.getByText(/hosted by Marc/)).toBeInTheDocument();
  });

  it('falls back to a library-only welcome when context is null', () => {
    render(<GuestPreview slot="header" {...base} invitationContext={null} />);
    expect(screen.getByText(/Welcome to/)).toBeInTheDocument();
    expect(screen.queryByText(/invited you/)).not.toBeInTheDocument();
  });

  it('falls back when the inviter name is missing', () => {
    render(
      <GuestPreview
        slot="header"
        {...base}
        invitationContext={{ kind: 'personal', inviterName: null }}
      />
    );
    expect(screen.getByText(/Welcome to/)).toBeInTheDocument();
    expect(screen.queryByText(/invited you/)).not.toBeInTheDocument();
  });

  it('states the count in the plural', () => {
    render(<GuestPreview slot="header" {...base} invitationContext={null} />);
    expect(screen.getByText(/3 members share this shelf/)).toBeInTheDocument();
  });

  it('states the count in the singular', () => {
    render(
      <GuestPreview
        slot="header"
        {...base}
        memberCount={1}
        invitationContext={null}
      />
    );
    expect(screen.getByText(/1 member shares this shelf/)).toBeInTheDocument();
  });

  it('never says "porch" anywhere in the header', () => {
    const { container } = render(
      <GuestPreview
        slot="header"
        {...base}
        invitationContext={{ kind: 'personal', inviterName: 'Marc' }}
      />
    );
    expect(container.textContent?.toLowerCase()).not.toContain('porch');
  });
});

describe('GuestPreview — claim slot', () => {
  it('renders the claim CTA and calls onClaim', () => {
    const onClaim = vi.fn();
    render(
      <GuestPreview
        slot="claim"
        {...base}
        onClaim={onClaim}
        invitationContext={null}
      />
    );
    const button = screen.getByRole('button', {
      name: /Claim your library card/i,
    });
    fireEvent.click(button);
    expect(onClaim).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/__tests__/GuestPreview.test.tsx`
Expected: FAIL — cannot resolve `../GuestPreview`.

- [ ] **Step 3: Write the component**

Create `src/components/GuestPreview.tsx`:

```tsx
'use client';

import { Box, Button, Typography } from '@mui/material';
import type { ReactNode } from 'react';

import { brandColors, spacing } from '@/theme/brandTokens';

// "Front porch" is the internal design metaphor for this screen; it must never
// appear in the copy below. The visitor is a guest looking at a library card.
export interface GuestPreviewProps {
  slot: 'header' | 'claim';
  libraryName: string;
  invitationContext:
    | { kind: 'personal'; inviterName: string | null }
    | { kind: 'code'; inviterName: string | null }
    | null;
  memberCount: number;
  onClaim: () => void;
}

function countLine(memberCount: number): string {
  const verb = memberCount === 1 ? 'member shares' : 'members share';
  return `${memberCount} ${verb} this shelf · you'll meet them once you join`;
}

export function GuestPreview({
  slot,
  libraryName,
  invitationContext,
  memberCount,
  onClaim,
}: GuestPreviewProps) {
  if (slot === 'claim') {
    return (
      <Box
        sx={{
          mt: spacing.xl / 16,
          mb: spacing.xl / 16,
          p: 3,
          borderRadius: 2,
          border: `1.5px solid ${brandColors.inkBlue}`,
          bgcolor: brandColors.warmCream,
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{
            fontFamily: 'var(--font-roboto-mono), monospace',
            fontSize: '0.75rem',
            letterSpacing: 2,
            color: brandColors.charcoal,
            mb: 1,
          }}
        >
          LIBRARY CARD · {libraryName.toUpperCase()}
        </Typography>
        <Button
          variant="contained"
          onClick={onClaim}
          sx={{
            bgcolor: brandColors.inkBlue,
            '&:hover': { bgcolor: brandColors.inkBlue },
          }}
        >
          Claim your library card
        </Button>
        <Typography
          variant="body2"
          sx={{ color: brandColors.charcoal, mt: 1.5 }}
        >
          Free · takes a minute
        </Typography>
      </Box>
    );
  }

  const inviterName = invitationContext?.inviterName ?? null;
  let heading: ReactNode;
  if (
    invitationContext &&
    inviterName &&
    invitationContext.kind === 'personal'
  ) {
    heading = (
      <>
        <strong>{inviterName}</strong> invited you to{' '}
        <strong>{libraryName}</strong>
      </>
    );
  } else if (
    invitationContext &&
    inviterName &&
    invitationContext.kind === 'code'
  ) {
    heading = (
      <>
        <strong>{libraryName}</strong> — hosted by{' '}
        <strong>{inviterName}</strong>
      </>
    );
  } else {
    heading = (
      <>
        Welcome to <strong>{libraryName}</strong>
      </>
    );
  }

  return (
    <Box
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 2,
        border: `1.5px solid ${brandColors.inkBlue}`,
        bgcolor: brandColors.warmCream,
      }}
    >
      <Typography
        sx={{
          fontFamily: 'var(--font-merriweather), Georgia, serif',
          fontSize: '1.5rem',
          color: brandColors.inkBlue,
          mb: 1.5,
        }}
      >
        {heading}
      </Typography>
      <Typography variant="body2" sx={{ color: brandColors.charcoal, mb: 1 }}>
        The stuff is public to invited guests. The people aren&rsquo;t — names
        and faces stay members-only.
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontFamily: 'var(--font-roboto-mono), monospace',
          fontSize: '0.8rem',
          color: brandColors.charcoal,
        }}
      >
        {countLine(memberCount)}
      </Typography>
    </Box>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/__tests__/GuestPreview.test.tsx`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/GuestPreview.tsx src/components/__tests__/GuestPreview.test.tsx
git commit -m "feat(invites): GuestPreview component — inviter header + claim-card CTA

A presentational two-slot component (header / claim) that names the
inviter or host, states the privacy promise, and reframes the join CTA
as claiming a library card. No data fetching; wired next.

Why: consolidate the three scattered guest blocks into one branded surface built around who invited you

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Wire `GuestPreview` into `CollectionDetailClient`

**Files:**

- Modify: `src/components/CollectionDetailClient.tsx` — the `LibraryData` interface (~L130), and the three guest-only blocks (~L744 welcome banner, ~L1354 privacy note, ~L1696 join block)

- [ ] **Step 1: Add `invitationContext` to the `LibraryData` interface**

In `src/components/CollectionDetailClient.tsx`, the `LibraryData` interface has `userRole` and `memberCount`. Add the new optional field next to `memberCount: number;`:

```ts
  memberCount: number;
  invitationContext?:
    | { kind: 'personal'; inviterName: string | null }
    | { kind: 'code'; inviterName: string | null }
    | null;
```

- [ ] **Step 2: Import the component**

Add to the component imports (alongside the other `./` component imports near the top):

```ts
import { GuestPreview } from './GuestPreview';
```

- [ ] **Step 3: Replace the top welcome banner with the header slot**

Find the guest welcome banner block (starts `{/* Guest Banner (magic link guest pass) */}`, `library?.userRole === 'guest'`, renders "Welcome! Check this out 👋"). Replace the entire block with:

```tsx
{
  /* Guest header: names the inviter/host + the privacy promise. */
}
{
  library?.userRole === 'guest' && (
    <GuestPreview
      slot="header"
      libraryName={library.name}
      invitationContext={library.invitationContext ?? null}
      memberCount={library.memberCount}
      onClaim={joinLibrary}
    />
  );
}
```

- [ ] **Step 4: Remove the mid privacy note**

Find the block starting `{/* Privacy explanation for guests - under map */}` (`library?.userRole === 'guest'`, renders "We keep member details private until you join…"). Delete the entire block — the privacy promise now lives in the header slot. (Removing it, not replacing it: it would otherwise duplicate the header's promise.)

- [ ] **Step 5: Replace the bottom join block with the claim slot**

Find the block starting `{/* Join section for guests - after items */}` (`library?.userRole === 'guest'`, renders "Ready to join? It's easy:" + "Sign me up!"). Replace the entire block with:

```tsx
{
  /* Guest claim: the library-card CTA. Join behavior is unchanged. */
}
{
  library?.userRole === 'guest' && (
    <GuestPreview
      slot="claim"
      libraryName={library.name}
      invitationContext={library.invitationContext ?? null}
      memberCount={library.memberCount}
      onClaim={joinLibrary}
    />
  );
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0. (If errors appear, confirm they are pre-existing and not in `CollectionDetailClient.tsx` or `GuestPreview.tsx`.)

- [ ] **Step 7: Lint the two touched files**

Run: `npx eslint src/components/CollectionDetailClient.tsx src/components/GuestPreview.tsx`
Expected: no errors (pre-existing `any` warnings in `CollectionDetailClient` are acceptable; introduce no new ones).

- [ ] **Step 8: Confirm no stray guest blocks or metaphor leaks remain**

Run: `grep -n "Check this out\|We keep member details\|Ready to join\|Sign me up\|porch\|Porch" src/components/CollectionDetailClient.tsx`
Expected: no matches. (All three old blocks removed; no metaphor leak.)

- [ ] **Step 9: Commit**

```bash
git add src/components/CollectionDetailClient.tsx
git commit -m "feat(invites): render GuestPreview, retire the three old guest blocks

The welcome banner, the mid privacy note, and the 'Ready to join'
checklist are replaced by the GuestPreview header + claim slots, which
name the inviter and carry the same join behavior.

Why: the guest sees one branded arrival built around who invited them, not three generic boxes

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Final verification and PR

**Files:** none modified (unless verification finds regressions).

- [ ] **Step 1: Full unit suite**

Run: `npm run test:unit 2>&1 | tail -8`
Expected: no failures beyond any pre-existing ones (baseline this session was 959 pass / 2 skip; this plan adds tests, so the pass count rises).

- [ ] **Step 2: Lint and typecheck**

Run: `npm run lint && npx tsc --noEmit`
Expected: clean (only pre-existing `any` warnings).

- [ ] **Step 3: Metaphor-leak sweep across the whole change**

Run: `git diff main...HEAD -- src/ | grep -in "porch"`
Expected: no matches in `src/` (the word may appear only in `docs/` design prose, which this command excludes).

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin feat/front-porch-guest-preview
```

Open a PR to `main` titled `feat(invites): guest-preview redesign — name the inviter, claim the card`. Body: summarize the new `invitationContext` API field (first-name-only, #497 intact), the `GuestPreview` component replacing three blocks, and that join behavior/wizard are unchanged (photo-defer is sub-project C). Note the naming constraint (front porch is internal-only). Link the spec. End the body with:

```
Field-Note-Why:         the guest preview never named who invited you — the dossier's §6.1 calls that the strongest unused trust signal
Field-Note-Interesting: the whole reveal is one first name + a count; every stronger identity stays behind the #497 redaction
Field-Note-Deferred:    the onboarding ceremony (stamp / sign-your-card, photo-address deferral) — sub-project C

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

- [ ] **Step 5: Manual check (human, on preview)**

Click a real bound invite signed-out → the guest header names the inviter, the shelf shows, the CTA reads "Claim your library card"; a join-code link shows "hosted by {owner}". Confirm no screen says "porch."

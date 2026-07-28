# Invitee Pending-Invites Panel (#504) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a signed-in member an in-app, above-the-drawer band on the lobby that lists the libraries they've been invited to but not joined, and lets them claim one in a click — landing on the arrival screen.

**Architecture:** A `usePendingInvitations` hook (mirrors `useCollections`) feeds a presentational `InvitedLibraryCard` and a container `InvitedLibraries` band. The band is mounted in `LobbyClient` between `GreetingDesk` and `LibraryDrawer`, renders nothing when there are no invites, and claims via the existing (correct) `POST /api/invitations/[token]/accept`. The orphaned, stale `InvitedLibrariesSection.tsx` is deleted.

**Tech Stack:** Next.js App Router (client components), React + MUI, Vitest + Testing Library (happy-dom), `renderHook` for the hook.

**Branch:** `feat/pending-invites-panel` (already checked out off fresh `main`; spec committed).

**Spec:** `docs/superpowers/specs/2026-07-28-pending-invites-panel-design.md`

**Design note — load errors are silent by design.** The band is a best-effort side panel that renders nothing when there are no invites. A _load_ failure is indistinguishable from "no invites," so it renders nothing (no error banner cluttering the lobby on a transient blip). Only a _claim_ failure — a user action — surfaces an inline error, because the band is already on screen and the user is owed feedback. The hook still exposes `error` (unit-tested); the band just doesn't render it.

---

## File Structure

- **New** `src/hooks/usePendingInvitations.ts` — owns the pending-invites fetch.
- **New** `src/components/member-home/InvitedLibraryCard.tsx` — one invitation, presentational.
- **New** `src/components/member-home/InvitedLibraries.tsx` — the band: fetch state + claim + render.
- **Modify** `src/components/LobbyClient.tsx` — mount the band above the drawer.
- **Delete** `src/components/InvitedLibrariesSection.tsx` — orphaned, stale.
- **Tests:** `src/hooks/__tests__/usePendingInvitations.test.ts`, `src/components/__tests__/InvitedLibraryCard.test.tsx`, `src/components/__tests__/InvitedLibraries.test.tsx`, `src/components/__tests__/LobbyClient.mount.test.tsx`.

**Unchanged (verified correct):** `src/app/api/invitations/pending/route.ts` (returns `{ invitations: [{ id, token, collection:{ id, name, location, owner, memberCount }, invitedBy, createdAt, expiresAt }] }`), `src/app/api/invitations/[token]/accept/route.ts` (returns `{ library:{ id, name, location, role }, user:{ firstName } }`, fires D's arrival notification via `acceptInvitation`).

---

## Task 1: `usePendingInvitations` hook

Mirror the shape and error handling of `src/hooks/useCollections.ts` (fetch on mount, `{ data, isLoading, error, refetch }`).

**Files:**

- Create: `src/hooks/usePendingInvitations.ts`
- Test: `src/hooks/__tests__/usePendingInvitations.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/__tests__/usePendingInvitations.test.ts`:

```ts
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';

import { usePendingInvitations } from '../usePendingInvitations';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const SAMPLE = {
  id: 'inv1',
  token: 'tok1',
  collection: {
    id: 'lib1',
    name: 'Maple Street Tools',
    location: null,
    owner: { name: 'Dana', email: 'dana@example.com' },
    memberCount: 14,
  },
  invitedBy: { name: 'Dana', email: 'dana@example.com' },
  createdAt: '2026-07-20T00:00:00.000Z',
  expiresAt: '2026-08-03T00:00:00.000Z',
};

describe('usePendingInvitations', () => {
  it('returns the invitations from the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(200, { invitations: [SAMPLE] }))
    );
    const { result } = renderHook(() => usePendingInvitations());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.invitations).toHaveLength(1);
    expect(result.current.invitations[0]!.collection.name).toBe(
      'Maple Street Tools'
    );
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error and empties the list on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(500, {})));
    const { result } = renderHook(() => usePendingInvitations());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.invitations).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/__tests__/usePendingInvitations.test.ts`
Expected: FAIL — `Cannot find module '../usePendingInvitations'`.

- [ ] **Step 3: Write the hook**

Create `src/hooks/usePendingInvitations.ts`:

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';

export interface PendingInvitation {
  id: string;
  token: string;
  collection: {
    id: string;
    name: string;
    location?: string | null;
    owner: { name?: string | null; email?: string | null };
    memberCount: number;
  };
  invitedBy?: { name?: string | null; email?: string | null } | null;
  createdAt: string;
  expiresAt: string;
}

interface UsePendingInvitationsReturn {
  invitations: PendingInvitation[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePendingInvitations(): UsePendingInvitationsReturn {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/invitations/pending');
      if (!response.ok) {
        throw new Error('Failed to fetch invitations');
      }

      const data = await response.json();
      setInvitations(data.invitations || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load invitations'
      );
      setInvitations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  return { invitations, isLoading, error, refetch: fetchInvitations };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/__tests__/usePendingInvitations.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePendingInvitations.ts src/hooks/__tests__/usePendingInvitations.test.ts
git commit -m "feat(invites): usePendingInvitations hook for the invitee lobby panel"
```

Append the trailer after a blank line:

```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

---

## Task 2: `InvitedLibraryCard` presentational component

One invitation rendered in the member-home visual language (warm paper, ink-blue serif name, `vintageTokens`). Purely presentational — it takes the invitation, an `isClaiming` flag, and an `onClaim(token)` callback. No fetching.

**Files:**

- Create: `src/components/member-home/InvitedLibraryCard.tsx`
- Test: `src/components/__tests__/InvitedLibraryCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/InvitedLibraryCard.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import type { PendingInvitation } from '@/hooks/usePendingInvitations';

import { InvitedLibraryCard } from '../member-home/InvitedLibraryCard';

const INV: PendingInvitation = {
  id: 'inv1',
  token: 'tok1',
  collection: {
    id: 'lib1',
    name: 'Maple Street Tools',
    location: null,
    owner: { name: 'Dana' },
    memberCount: 14,
  },
  invitedBy: { name: 'Dana', email: 'dana@example.com' },
  createdAt: '2026-07-20T00:00:00.000Z',
  expiresAt: '2026-08-03T00:00:00.000Z',
};

describe('InvitedLibraryCard', () => {
  it('shows the library, inviter, member count, and expiry', () => {
    render(
      <InvitedLibraryCard
        invitation={INV}
        isClaiming={false}
        onClaim={() => {}}
      />
    );
    expect(screen.getByText('Maple Street Tools')).toBeInTheDocument();
    expect(
      screen.getByText(/Invited by Dana · 14 members/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Card expires/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /claim your card/i })
    ).toBeInTheDocument();
  });

  it('calls onClaim with the token when clicked', () => {
    const onClaim = vi.fn();
    render(
      <InvitedLibraryCard
        invitation={INV}
        isClaiming={false}
        onClaim={onClaim}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /claim your card/i }));
    expect(onClaim).toHaveBeenCalledWith('tok1');
  });

  it('disables its button while claiming', () => {
    render(
      <InvitedLibraryCard invitation={INV} isClaiming onClaim={() => {}} />
    );
    expect(
      screen.getByRole('button', { name: /claim your card/i })
    ).toBeDisabled();
  });

  it('singularizes a one-member library', () => {
    render(
      <InvitedLibraryCard
        invitation={{
          ...INV,
          collection: { ...INV.collection, memberCount: 1 },
        }}
        isClaiming={false}
        onClaim={() => {}}
      />
    );
    expect(screen.getByText(/Invited by Dana · 1 member$/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/InvitedLibraryCard.test.tsx`
Expected: FAIL — `Cannot find module '../member-home/InvitedLibraryCard'`.

- [ ] **Step 3: Write the component**

Create `src/components/member-home/InvitedLibraryCard.tsx`:

```tsx
'use client';

import { Box, Button, CircularProgress, Typography } from '@mui/material';

import type { PendingInvitation } from '@/hooks/usePendingInvitations';
import { brandColors } from '@/theme/brandTokens';

import { vintage, vintageFonts } from './vintageTokens';

interface InvitedLibraryCardProps {
  invitation: PendingInvitation;
  isClaiming: boolean;
  onClaim: (token: string) => void;
}

/** One pending invitation: "a library card waiting to be claimed." */
export function InvitedLibraryCard({
  invitation,
  isClaiming,
  onClaim,
}: InvitedLibraryCardProps) {
  const { collection, invitedBy, expiresAt } = invitation;
  const inviter = invitedBy?.name?.trim() || 'a neighbor';
  const members = collection.memberCount;

  return (
    <Box
      sx={{
        background: brandColors.white,
        border: `1px solid ${vintage.cardBorder}`,
        borderRadius: '12px',
        p: '18px',
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
        justifyContent: 'space-between',
        gap: 2,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: vintageFonts.serif,
            fontSize: '18px',
            color: brandColors.inkBlue,
            mb: 0.5,
          }}
        >
          {collection.name}
        </Typography>
        <Typography variant="body2" sx={{ color: vintage.bodyInk }}>
          Invited by {inviter} · {members} member{members === 1 ? '' : 's'}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Card expires {new Date(expiresAt).toLocaleDateString()}
        </Typography>
      </Box>

      <Button
        onClick={() => onClaim(invitation.token)}
        disabled={isClaiming}
        variant="contained"
        aria-label={`Claim your card for ${collection.name}`}
        sx={{
          bgcolor: brandColors.inkBlue,
          '&:hover': { bgcolor: '#1a2f4f' },
          whiteSpace: 'nowrap',
          minWidth: 150,
        }}
      >
        {isClaiming ? (
          <CircularProgress size={18} sx={{ color: brandColors.white }} />
        ) : (
          'Claim your card'
        )}
      </Button>
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/InvitedLibraryCard.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/member-home/InvitedLibraryCard.tsx src/components/__tests__/InvitedLibraryCard.test.tsx
git commit -m "feat(invites): InvitedLibraryCard for the pending-invites panel"
```

Append the trailer after a blank line:

```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

---

## Task 3: `InvitedLibraries` band (fetch + claim + render)

The container: consumes the hook, renders `null` while loading or empty, otherwise a count-adaptive `DrawerSectionLabel` header + one `InvitedLibraryCard` per invite. Owns the claim handler (POST accept → redirect to the arrival; on failure, inline error + refetch).

**Files:**

- Create: `src/components/member-home/InvitedLibraries.tsx`
- Test: `src/components/__tests__/InvitedLibraries.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/InvitedLibraries.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { InvitedLibraries } from '../member-home/InvitedLibraries';

const INVITES = [
  {
    id: 'inv1',
    token: 'tok1',
    collection: {
      id: 'lib1',
      name: 'Maple Street Tools',
      location: null,
      owner: { name: 'Dana' },
      memberCount: 14,
    },
    invitedBy: { name: 'Dana' },
    createdAt: '2026-07-20T00:00:00.000Z',
    expiresAt: '2026-08-03T00:00:00.000Z',
  },
];

// URL+method-aware fetch: the pending GET the band hits on mount, plus the
// accept POST that Claim fires.
function stubFetch(opts?: { invitations?: unknown[]; acceptOk?: boolean }) {
  const acceptOk = opts?.acceptOk ?? true;
  const invitations = opts?.invitations ?? INVITES;
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/accept') && init?.method === 'POST') {
      return {
        ok: acceptOk,
        status: acceptOk ? 200 : 400,
        json: async () =>
          acceptOk
            ? { library: { id: 'lib1' }, user: { firstName: 'Marc' } }
            : { error: 'Invitation has expired' },
      } as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ invitations }),
    } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('InvitedLibraries', () => {
  it('renders a card per pending invitation under the waiting label', async () => {
    stubFetch();
    render(<InvitedLibraries />);
    expect(await screen.findByText('Maple Street Tools')).toBeInTheDocument();
    expect(screen.getByText(/A LIBRARY CARD IS WAITING/)).toBeInTheDocument();
  });

  it('renders nothing when there are no invitations', async () => {
    stubFetch({ invitations: [] });
    const { container } = render(<InvitedLibraries />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('claims: posts to accept and redirects to the arrival', async () => {
    const assign = vi
      .spyOn(window.location, 'assign')
      .mockImplementation(() => {});
    stubFetch();
    render(<InvitedLibraries />);
    fireEvent.click(
      await screen.findByRole('button', { name: /claim your card/i })
    );
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith(
        expect.stringContaining('/library/lib1?message=joined_successfully')
      )
    );
    expect(assign).toHaveBeenCalledWith(
      expect.stringContaining('welcomeName=Marc')
    );
  });

  it('shows an inline error and keeps the card when a claim fails', async () => {
    stubFetch({ acceptOk: false });
    render(<InvitedLibraries />);
    fireEvent.click(
      await screen.findByRole('button', { name: /claim your card/i })
    );
    expect(
      await screen.findByText(/expired|could not claim/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Maple Street Tools')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/InvitedLibraries.test.tsx`
Expected: FAIL — `Cannot find module '../member-home/InvitedLibraries'`.

- [ ] **Step 3: Write the component**

Create `src/components/member-home/InvitedLibraries.tsx`:

```tsx
'use client';

import { Alert, Box, Stack } from '@mui/material';
import { useState } from 'react';

import { usePendingInvitations } from '@/hooks/usePendingInvitations';

import { InvitedLibraryCard } from './InvitedLibraryCard';
import { DrawerSectionLabel } from './LibraryDrawer';

export function InvitedLibraries() {
  const { invitations, isLoading, refetch } = usePendingInvitations();
  const [claimingToken, setClaimingToken] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const handleClaim = async (token: string) => {
    setClaimingToken(token);
    setClaimError(null);
    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (response.ok) {
        // Straight to the arrival — the same welcome contract as every other
        // join path (?message=joined_successfully lights up ArrivalWelcome).
        const url = new URL(
          `/library/${data.library.id}`,
          window.location.origin
        );
        url.searchParams.set('message', 'joined_successfully');
        if (data.user?.firstName) {
          url.searchParams.set('welcomeName', data.user.firstName);
        }
        window.location.assign(url.toString());
        return; // navigating away — leave the card's spinner up
      }

      setClaimError(
        data.error || 'Could not claim this card. Please try again.'
      );
      refetch(); // an invite that expired between load and click drops off
    } catch (err) {
      console.error('Failed to claim invitation:', err);
      setClaimError('Could not claim this card. Please try again.');
    } finally {
      setClaimingToken(null);
    }
  };

  // A best-effort side panel: never take up lobby space while loading or when
  // there is nothing waiting. A load failure reads as "nothing waiting" (the
  // hook still records the error; there is just nothing to shout about here).
  if (isLoading || invitations.length === 0) {
    return null;
  }

  const label =
    invitations.length === 1
      ? 'A LIBRARY CARD IS WAITING'
      : 'LIBRARY CARDS WAITING FOR YOU';

  return (
    <Box sx={{ mb: '48px' }}>
      <DrawerSectionLabel>{label}</DrawerSectionLabel>
      {claimError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {claimError}
        </Alert>
      )}
      <Stack spacing={2}>
        {invitations.map((invitation) => (
          <InvitedLibraryCard
            key={invitation.id}
            invitation={invitation}
            isClaiming={claimingToken === invitation.token}
            onClaim={handleClaim}
          />
        ))}
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/InvitedLibraries.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/member-home/InvitedLibraries.tsx src/components/__tests__/InvitedLibraries.test.tsx
git commit -m "feat(invites): InvitedLibraries band — claim a waiting library card"
```

Append the trailer after a blank line:

```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

---

## Task 4: Mount the band in the lobby + delete the orphan

**Files:**

- Modify: `src/components/LobbyClient.tsx`
- Delete: `src/components/InvitedLibrariesSection.tsx`
- Test: `src/components/__tests__/LobbyClient.mount.test.tsx`

- [ ] **Step 1: Write the failing mount test**

Create `src/components/__tests__/LobbyClient.mount.test.tsx`. It mocks LobbyClient's data hooks (so nothing fetches) and stubs the band with a sentinel, then asserts the sentinel renders:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/hooks/useCollections', () => ({
  useCollections: () => ({
    collections: [],
    isLoading: false,
    createCollection: vi.fn(),
  }),
}));
vi.mock('@/hooks/useUserItems', () => ({
  useUserItems: () => ({
    readyToLendItems: [],
    onLoanItems: [],
    offlineItems: [],
    borrowedItems: [],
    isLoading: false,
  }),
}));
vi.mock('@/hooks/useCapabilities', () => ({
  useCapabilities: () => ({ capabilities: null }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('../member-home/InvitedLibraries', () => ({
  InvitedLibraries: () => <div data-testid="invited-libraries" />,
}));

import { LobbyClient } from '../LobbyClient';

describe('LobbyClient', () => {
  it('mounts the pending-invitations band', () => {
    render(
      <LobbyClient
        user={{ id: 'u1', name: 'Marc', email: 'm@example.com' }}
        showWelcome={false}
      />
    );
    expect(screen.getByTestId('invited-libraries')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/LobbyClient.mount.test.tsx`
Expected: FAIL — the `invited-libraries` testid is not found (band not yet mounted). (The `vi.mock('../member-home/InvitedLibraries', …)` resolves to the same module `LobbyClient` will import; before Step 3 the import doesn't exist so the sentinel never renders.)

- [ ] **Step 3: Add the import**

In `src/components/LobbyClient.tsx`, add the import alongside the other `./member-home/*` imports (keep import ordering: it sits with the member-home group):

```tsx
import { GreetingDesk } from './member-home/GreetingDesk';
import { InvitedLibraries } from './member-home/InvitedLibraries';
import { DrawerSectionLabel, LibraryDrawer } from './member-home/LibraryDrawer';
```

- [ ] **Step 4: Mount the band above the drawer**

In `src/components/LobbyClient.tsx`, the render currently has the `GreetingDesk` block immediately followed by `<LibraryDrawer`. Insert `<InvitedLibraries />` between them:

```tsx
      <GreetingDesk
        eyebrow={memberSinceLabel(user.createdAt)}
        cardNumber={cardNumber(user.id)}
        firstName={firstNameOf(user.name)}
      />

      <InvitedLibraries />

      <LibraryDrawer
```

- [ ] **Step 5: Delete the orphaned component**

```bash
git rm src/components/InvitedLibrariesSection.tsx
```

(Confirm first that nothing imports it — it is unreferenced:
`grep -rn "InvitedLibrariesSection\|InvitedBranchesSection" src/` should return only the file itself before deletion, nothing after.)

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/components/__tests__/LobbyClient.mount.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 7: Commit**

```bash
git add src/components/LobbyClient.tsx src/components/__tests__/LobbyClient.mount.test.tsx
git commit -m "feat(invites): mount the pending-invites band on the lobby; drop the orphan"
```

Append the trailer after a blank line:

```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

(The `git rm` from Step 5 is already staged and will be part of this commit.)

---

## Task 5: Whole-suite verification + PR

**Files:** none (verification only)

- [ ] **Step 1: Full unit suite**

Run: `npm run test:unit`
Expected: PASS — no new failures. (The four new test files add ~11 passing tests.)

- [ ] **Step 2: Typecheck, lint, build**

Run: `rm -rf .next && npm run typecheck && npm run lint && npm run build`
Expected: PASS. (`rm -rf .next` clears a known stale `.next/types` artifact from a deleted route that otherwise trips `typecheck`; `build` also catches Next's generated-types constraints that `typecheck` alone misses.)

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin feat/pending-invites-panel
```

Open a PR off `main` titled `feat(invites): invitee pending-invites panel (#504)`. Summarize: the above-the-drawer band that surfaces a signed-in member's pending library invitations and claims one in a click (landing on the arrival), built as `usePendingInvitations` + `InvitedLibraries` + `InvitedLibraryCard`; the stale orphaned `InvitedLibrariesSection` deleted; the pending/accept APIs unchanged (already correct). Note the deliberate scope: no decline/dismiss, load failures render silently (claim failures show inline), one-click claim skips the guest preview for an already-signed-in invitee.

---

## Self-Review Notes

- **Spec coverage:** hook (Task 1) ✓; card visual + voice (Task 2) ✓; band with claim→arrival + inline claim error + refetch (Task 3) ✓; above-the-drawer mount + orphan deletion (Task 4) ✓; full-suite gate + PR (Task 5) ✓. Out-of-scope items (API changes, decline/dismiss, cross-tab badge) absent by construction.
- **Type consistency:** `PendingInvitation` is defined in Task 1 and imported by Tasks 2/3; the card reads `collection.name`/`collection.memberCount`/`invitedBy?.name`/`expiresAt`; the band reads `data.library.id`/`data.user.firstName` (matching the accept route's real response), not the orphan's wrong `data.branch.id`.
- **Placement:** the band mounts between `GreetingDesk` and `LibraryDrawer` — above the drawer, always visible — coexisting with F's `JoinCodeEntry` (which sits at the bottom of the LIBRARIES tab).
- **Load-error decision** is documented once at the top and encoded in Task 3 (band returns `null` while loading/empty; only `claimError` renders).

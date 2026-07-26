# Recovery "Have a code?" Entry — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the existing `/join/[code]` route a door you can type into — a "Have a code?" entry on the signed-in lobby and the sign-in screen — so a code off a flyer/SMS can be redeemed without following the full URL, and without ejecting a signed-in member on a typo.

**Architecture:** A resolve-only endpoint (`POST /api/join/resolve`) says whether a typed code matches, sharing `/join`'s IP failure-throttle so it isn't an enumeration oracle. A shared `JoinCodeEntry` client component reveals a field on tap, checks the code against that endpoint, and on a hit hands off to the existing `/join/<code>` route (which does the real join when signed in, or the guest preview when signed out). No new join logic — the plumbing already exists.

**Tech Stack:** Next.js App Router (route handlers), React + MUI client components, Vitest + Testing Library (happy-dom), Prisma.

**Branch:** `feat/recovery-have-a-code` (already checked out; spec committed).

**Spec:** `docs/superpowers/specs/2026-07-26-recovery-have-a-code-design.md`

---

## File Structure

- **New** `src/lib/client-ip.ts` — the one place the join endpoints derive a client address for throttling. Extracted from the `/join` route so the resolve endpoint can't drift from it.
- **New** `src/app/api/join/resolve/route.ts` — resolve-only endpoint, no redirect.
- **New** `src/components/JoinCodeEntry.tsx` — the shared "Have a code?" door.
- **Modify** `src/app/join/[code]/route.ts` — use the extracted `clientIp`.
- **Modify** `src/components/LobbyClient.tsx` — mount the door under "LIBRARIES I'VE JOINED".
- **Modify** `src/app/auth/signin/page.tsx` — mount the door on the email step.
- **Tests:** `src/lib/__tests__/client-ip.test.ts`, `src/app/api/join/resolve/__tests__/route.test.ts`, `src/components/__tests__/JoinCodeEntry.test.tsx`, plus one case added to `src/app/auth/signin/__tests__/page.test.tsx`.

---

## Task 1: Extract the client-IP helper

The `/join` route derives the throttle key inline. The resolve endpoint needs the identical logic; duplicating it risks the two drifting on something security-relevant. Extract it, cover it, repoint the route.

**Files:**

- Create: `src/lib/client-ip.ts`
- Create: `src/lib/__tests__/client-ip.test.ts`
- Modify: `src/app/join/[code]/route.ts` (remove local `clientIp`, import the shared one)

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/client-ip.test.ts`:

```ts
import { NextRequest } from 'next/server';
import { describe, it, expect } from 'vitest';

import { clientIp } from '../client-ip';

function req(headers: Record<string, string>) {
  return new NextRequest('http://localhost/join/X', { headers });
}

describe('clientIp', () => {
  it('takes the first entry of x-forwarded-for', () => {
    expect(clientIp(req({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe(
      '203.0.113.7'
    );
  });

  it('falls back to x-real-ip', () => {
    expect(clientIp(req({ 'x-real-ip': '203.0.113.7' }))).toBe('203.0.113.7');
  });

  it('falls back to a shared bucket when no address is present', () => {
    expect(clientIp(req({}))).toBe('unknown');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/client-ip.test.ts`
Expected: FAIL — cannot find module `../client-ip`.

- [ ] **Step 3: Write the helper**

Create `src/lib/client-ip.ts`:

```ts
import { type NextRequest } from 'next/server';

/**
 * The client's address for rate-limiting: the first hop of x-forwarded-for,
 * then x-real-ip, then a shared 'unknown' bucket. Shared by every endpoint that
 * meters join-code lookups so the parsing can't drift between them.
 */
export function clientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/client-ip.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Repoint the `/join` route at the shared helper**

In `src/app/join/[code]/route.ts`, delete the local `clientIp` function (the block starting `function clientIp(request: NextRequest): string {` through its closing brace) and add the import alongside the existing imports:

```ts
import { clientIp } from '@/lib/client-ip';
```

Leave every call site (`const ip = clientIp(request);`) unchanged.

- [ ] **Step 6: Run the join-route tests to confirm no behavior change**

Run: `npx vitest run src/app/join`
Expected: PASS — the existing route tests (client-identity, throttling) still pass unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/lib/client-ip.ts src/lib/__tests__/client-ip.test.ts "src/app/join/[code]/route.ts"
git commit -m "refactor(invites): extract shared clientIp for join throttling"
```

---

## Task 2: The resolve-only endpoint

`POST /api/join/resolve` mirrors `/join`'s resolution and throttle but returns a bare `{ ok }` instead of redirecting, so a bad code can surface inline.

**Files:**

- Create: `src/app/api/join/resolve/route.ts`
- Create: `src/app/api/join/resolve/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/join/resolve/__tests__/route.test.ts`:

```ts
import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockResolveJoinCode = vi.hoisted(() => vi.fn());
const mockInvitationFindFirst = vi.hoisted(() => vi.fn());
const mockIsBlocked = vi.hoisted(() => vi.fn());
const mockRecordFailure = vi.hoisted(() => vi.fn());

vi.mock('@/lib/join-code-service', () => ({
  resolveJoinCode: mockResolveJoinCode,
}));
vi.mock('@/lib/db', () => ({
  db: { invitation: { findFirst: mockInvitationFindFirst } },
}));
vi.mock('@/lib/join-code-rate-limit', () => ({
  isJoinLookupBlocked: mockIsBlocked,
  recordJoinLookupFailure: mockRecordFailure,
}));

import { POST } from '../route';

const IP = '203.0.113.7';

function call(code: unknown, headers: Record<string, string> = {}) {
  const request = new NextRequest('http://localhost/api/join/resolve', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ code }),
  });
  return POST(request);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsBlocked.mockResolvedValue(false);
  mockRecordFailure.mockResolvedValue(undefined);
  mockResolveJoinCode.mockResolvedValue(null);
  mockInvitationFindFirst.mockResolvedValue(null);
});

describe('POST /api/join/resolve', () => {
  it('returns ok for a join code, without touching invitations', async () => {
    mockResolveJoinCode.mockResolvedValue({
      id: 'jc_1',
      collectionId: 'lib_1',
    });
    const res = await call('XKF72M9Q');
    expect(await res.json()).toEqual({ ok: true });
    expect(mockInvitationFindFirst).not.toHaveBeenCalled();
    expect(mockRecordFailure).not.toHaveBeenCalled();
  });

  it('falls through to a personal invitation short code', async () => {
    mockInvitationFindFirst.mockResolvedValue({ id: 'inv_1' });
    const res = await call('ABCD1234');
    expect(await res.json()).toEqual({ ok: true });
    expect(mockRecordFailure).not.toHaveBeenCalled();
  });

  it('normalizes before looking up', async () => {
    await call('xkf7-2m9q');
    expect(mockResolveJoinCode).toHaveBeenCalledWith('XKF72M9Q');
    expect(mockInvitationFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { shortCode: 'XKF72M9Q' } })
    );
  });

  it('returns ok:false and records the miss when nothing matches', async () => {
    const res = await call('ZZZZZZZZ', { 'x-forwarded-for': IP });
    expect(await res.json()).toEqual({ ok: false });
    expect(mockRecordFailure).toHaveBeenCalledWith(IP);
  });

  it('consults the limiter on every request', async () => {
    await call('XKF72M9Q', { 'x-forwarded-for': IP });
    expect(mockIsBlocked).toHaveBeenCalledWith(IP);
  });

  it('refuses a blocked client with 429 before any lookup', async () => {
    mockIsBlocked.mockResolvedValue(true);
    const res = await call('XKF72M9Q', { 'x-forwarded-for': IP });
    expect(res.status).toBe(429);
    expect(mockResolveJoinCode).not.toHaveBeenCalled();
    expect(mockInvitationFindFirst).not.toHaveBeenCalled();
  });

  it('rejects a missing code with 400 and does not count it as a guess', async () => {
    const res = await call(undefined, { 'x-forwarded-for': IP });
    expect(res.status).toBe(400);
    expect(mockRecordFailure).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/join/resolve`
Expected: FAIL — cannot find module `../route`.

- [ ] **Step 3: Write the route**

Create `src/app/api/join/resolve/route.ts`:

```ts
import { type NextRequest, NextResponse } from 'next/server';

import { clientIp } from '@/lib/client-ip';
import { db } from '@/lib/db';
import { normalizeJoinCode } from '@/lib/join-code';
import {
  isJoinLookupBlocked,
  recordJoinLookupFailure,
} from '@/lib/join-code-rate-limit';
import { resolveJoinCode } from '@/lib/join-code-service';

/**
 * Resolve-only twin of GET /join/[code]: says whether a typed code matches,
 * without redirecting, so an entry field can show an inline error instead of
 * bouncing a signed-in member out of their lobby.
 *
 * It shares the SAME failure throttle as /join and leaks only the one bit that
 * route's redirect target already leaks. Without the shared throttle this would
 * be a clean JSON enumeration oracle that /join is not — so the guard runs
 * first, and only a genuine miss spends budget.
 *
 * POST with a body (not the code in the path) keeps the bearer code out of
 * access logs. A malformed body is a 400, not a guess — it does not spend
 * throttle budget.
 */
export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (await isJoinLookupBlocked(ip)) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const code = body?.code;
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'A code is required' }, { status: 400 });
  }

  const normalized = normalizeJoinCode(code);

  const joinCode = await resolveJoinCode(normalized);
  if (joinCode) return NextResponse.json({ ok: true });

  const invitation = await db.invitation.findFirst({
    where: { shortCode: normalized },
    select: { id: true },
  });
  if (invitation) return NextResponse.json({ ok: true });

  await recordJoinLookupFailure(ip);
  return NextResponse.json({ ok: false });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/join/resolve`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/join/resolve/route.ts src/app/api/join/resolve/__tests__/route.test.ts
git commit -m "feat(invites): POST /api/join/resolve — check a code without redirecting"
```

---

## Task 3: The `JoinCodeEntry` component

The shared door. Reveal-on-tap; check on submit; navigate on a hit; inline error otherwise. **Never fetches on mount** — so it doesn't disturb a host surface's own on-mount fetches.

**Files:**

- Create: `src/components/JoinCodeEntry.tsx`
- Create: `src/components/__tests__/JoinCodeEntry.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/JoinCodeEntry.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { JoinCodeEntry } from '../JoinCodeEntry';

beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function reveal() {
  fireEvent.click(screen.getByRole('button', { name: /have a code/i }));
}

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('JoinCodeEntry', () => {
  it('does not fetch on mount', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<JoinCodeEntry />);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reveals the field only after the prompt is clicked', () => {
    render(<JoinCodeEntry />);
    expect(screen.queryByLabelText('Join code')).toBeNull();
    reveal();
    expect(screen.getByLabelText('Join code')).toBeTruthy();
  });

  it('navigates to /join on a valid code', async () => {
    const assign = vi
      .spyOn(window.location, 'assign')
      .mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }))
    );
    render(<JoinCodeEntry />);
    reveal();
    fireEvent.change(screen.getByLabelText('Join code'), {
      target: { value: 'xkf7-2m9q' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^join$/i }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/join/xkf7-2m9q'));
  });

  it('shows an inline error and does not navigate on a bad code', async () => {
    const assign = vi
      .spyOn(window.location, 'assign')
      .mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(200, { ok: false }))
    );
    render(<JoinCodeEntry />);
    reveal();
    fireEvent.change(screen.getByLabelText('Join code'), {
      target: { value: 'ZZZZ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^join$/i }));
    await waitFor(() => expect(screen.getByText(/didn't match/i)).toBeTruthy());
    expect(assign).not.toHaveBeenCalled();
  });

  it('shows a throttle message on 429', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(429, {})));
    render(<JoinCodeEntry />);
    reveal();
    fireEvent.change(screen.getByLabelText('Join code'), {
      target: { value: 'ZZZZ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^join$/i }));
    await waitFor(() =>
      expect(screen.getByText(/too many tries/i)).toBeTruthy()
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/JoinCodeEntry.test.tsx`
Expected: FAIL — cannot find module `../JoinCodeEntry`.

- [ ] **Step 3: Write the component**

Create `src/components/JoinCodeEntry.tsx`:

```tsx
'use client';

import { Box, Button, TextField, Typography } from '@mui/material';
import { useState } from 'react';

import { brandColors } from '@/theme/brandTokens';

type Status = 'idle' | 'checking' | 'error' | 'throttled';

/**
 * The "have a code?" door. A quiet prompt reveals a field; on a valid code it
 * hands off to /join/<code>, which does the real join (signed in) or guest
 * preview (signed out). A bad code shows inline and never navigates, so a
 * signed-in member is not ejected from their lobby on a typo.
 *
 * The raw typed value goes to the server, which normalizes it — so this never
 * imports join-code.ts and never drags node crypto into the client bundle. It
 * only ever calls the resolver on submit, never on mount, so it does not
 * disturb a host surface's own on-mount fetches.
 */
export function JoinCodeEntry() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const message =
    status === 'error'
      ? "That code didn't match — check for typos."
      : status === 'throttled'
        ? 'Too many tries — give it a minute.'
        : '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || status === 'checking') return;
    setStatus('checking');
    try {
      const res = await fetch('/api/join/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      });
      if (res.status === 429) {
        setStatus('throttled');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        window.location.assign(`/join/${encodeURIComponent(trimmed)}`);
        return;
      }
      setStatus('error');
    } catch {
      setStatus('error');
    }
  };

  if (!open) {
    return (
      <Button
        variant="text"
        onClick={() => setOpen(true)}
        sx={{
          textTransform: 'none',
          color: brandColors.inkBlue,
          textDecoration: 'underline',
          px: 0,
          '&:hover': { textDecoration: 'none', backgroundColor: 'transparent' },
        }}
      >
        Have a code?
      </Button>
    );
  }

  return (
    <Box component="form" onSubmit={submit}>
      <Typography
        variant="body2"
        sx={{ mb: 1, color: brandColors.charcoal, opacity: 0.8 }}
      >
        Enter the code from your invitation or a flyer.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          autoFocus
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (status !== 'checking') setStatus('idle');
          }}
          placeholder="XKF7-2M9Q"
          inputProps={{
            'aria-label': 'Join code',
            autoCapitalize: 'characters',
            autoCorrect: 'off',
            spellCheck: false,
          }}
          error={status === 'error' || status === 'throttled'}
          helperText={message}
          size="small"
          sx={{ flex: 1 }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={status === 'checking' || code.trim().length === 0}
          sx={{
            backgroundColor: brandColors.inkBlue,
            color: brandColors.white,
            textTransform: 'none',
            whiteSpace: 'nowrap',
            py: 1,
            '&:hover': { backgroundColor: '#1a2f4f' },
          }}
        >
          {status === 'checking' ? 'Checking…' : 'Join'}
        </Button>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/JoinCodeEntry.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/JoinCodeEntry.tsx src/components/__tests__/JoinCodeEntry.test.tsx
git commit -m "feat(invites): JoinCodeEntry — the 'have a code?' door"
```

---

## Task 4: Mount in the lobby

Put the door under "LIBRARIES I'VE JOINED", where a member who got a code for a new library looks to redeem it.

**Files:**

- Modify: `src/components/LobbyClient.tsx` (import + one mount)

- [ ] **Step 1: Add the import**

In `src/components/LobbyClient.tsx`, add alongside the other local component imports (near `import { DrawerSectionLabel, LibraryDrawer } from './member-home/LibraryDrawer';`):

```tsx
import { JoinCodeEntry } from './JoinCodeEntry';
```

- [ ] **Step 2: Mount it under the joined section**

Find the end of the "LIBRARIES I'VE JOINED" block — the `<JoinedEmptyState ... />` ternary closes with `)}` immediately before the `</Box>` that closes the libraries tab. Insert the door between them:

```tsx
              <JoinedEmptyState
                onInvite={inviteFromEmptyJoined}
                previewUrl={started[0]?.itemPreviews?.[0]}
                ownedLibraryName={started[0]?.name}
              />
            )}

            <Box sx={{ mt: '32px' }}>
              <JoinCodeEntry />
            </Box>
          </Box>
```

(The added `<Box sx={{ mt: '32px' }}>…</Box>` is the only new markup; the surrounding lines already exist.)

- [ ] **Step 3: Verify typecheck and lint (this is a wiring change; the door itself is unit-tested in Task 3)**

Run: `npm run typecheck && npm run lint`
Expected: PASS — no type or lint errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/LobbyClient.tsx
git commit -m "feat(invites): offer the join-code door in the lobby"
```

---

## Task 5: Mount on the sign-in screen

The signed-out door to the guest preview. Email is still the primary path — the code entry sits below it on the email step only (not the code step).

**Files:**

- Modify: `src/app/auth/signin/page.tsx` (import + one mount)
- Modify: `src/app/auth/signin/__tests__/page.test.tsx` (one case)

- [ ] **Step 1: Write the failing test**

In `src/app/auth/signin/__tests__/page.test.tsx`, add this case inside the top-level `describe` (the file already defines `stubInviteContext`, imports `SignIn`, `render`, `screen`). `JoinCodeEntry` does not fetch on mount, so `stubInviteContext`'s "unexpected fetch throws" guard stays satisfied:

```tsx
it('offers a join-code door on the email step', () => {
  stubInviteContext(null);
  render(<SignIn />);
  expect(screen.getByRole('button', { name: /have a code/i })).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/auth/signin/__tests__/page.test.tsx -t "join-code door"`
Expected: FAIL — no button matching /have a code/i.

- [ ] **Step 3: Add the import**

In `src/app/auth/signin/page.tsx`, add alongside the other `@/components` imports (near `import { CodeCells } from '@/components/CodeCells';`):

```tsx
import { JoinCodeEntry } from '@/components/JoinCodeEntry';
```

- [ ] **Step 4: Mount it below the email form**

On the email step (the final `return` of `SignInForm`), the email `<Box component="form" onSubmit={handleEmailSubmit}>` closes with `</Box>` just before `</CardContent>`. Insert the door between them:

```tsx
            </Box>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <JoinCodeEntry />
            </Box>
          </CardContent>
```

(Only the `<Box sx={{ mt: 3, textAlign: 'center' }}>…</Box>` is new; the `</Box>` above it closes the existing email form and the `</CardContent>` already exists.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/app/auth/signin/__tests__/page.test.tsx`
Expected: PASS — including the new case, with the rest of the sign-in tests unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/app/auth/signin/page.tsx src/app/auth/signin/__tests__/page.test.tsx
git commit -m "feat(invites): offer the join-code door on the sign-in screen"
```

---

## Task 6: Whole-suite verification

The shared-helper gotcha (a change reachable by a sequenced `mockResolvedValueOnce` chain in another directory) is caught only by the full suite. Run it before opening the PR.

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit suite**

Run: `npm run test:unit`
Expected: PASS — no new failures. (Compare against the known pre-existing failures noted in the infra-gotchas memory; this change should not add any.)

- [ ] **Step 2: Typecheck, lint, and build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: PASS — `build` also catches the Next generated-types constraint that `typecheck` alone misses.

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin feat/recovery-have-a-code
```

Then open a PR off `main` titled `feat(invites): recovery "have a code?" entry (sub-project F)`, summarizing: the resolve-only endpoint (sharing `/join`'s throttle), the shared `JoinCodeEntry` door, and its two mounts. Note that the cross-device handoff is satisfied by the typable code re-resolving fresh on any device (no new UI), per the spec.

---

## Self-Review Notes

- **Spec coverage:** resolve endpoint (Task 2) ✓; `JoinCodeEntry` with inline error / no-eject / 429 (Task 3) ✓; lobby mount (Task 4) ✓; sign-in mount (Task 5) ✓; shared throttle + POST-body + `{ok}`-only (Task 2) ✓; no-client-crypto (raw value to server, Task 3) ✓; cross-device = no new UI (Task 6 PR note) ✓; full-suite gate (Task 6) ✓. Out-of-scope items (Hero, code-transfer UI, confirm step, SMS) are absent by construction.
- **Type consistency:** endpoint returns `{ ok: boolean }` / `{ error }`; component reads `data.ok` and branches on `res.status === 429`; navigation target `/join/${encodeURIComponent(trimmed)}` matches the existing route path. `clientIp` signature identical across Task 1's two consumers.
- **e2e safety:** the sign-in field is a MUI `TextField` (default `type="text"`), distinct from `input[type="email"]` and the `Digit N of 6` cells the `auth-code-flow.spec.ts` e2e drives — no selector clash, no e2e change.

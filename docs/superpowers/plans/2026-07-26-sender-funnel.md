# Sender-side Funnel (opened-tracking + resend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a host visibility into an invitation after sending — record when the invitee views the library ("opened"), surface it in the pending list, and add a per-invite Resend control.

**Architecture:** Add a nullable `openedAt` timestamp to `Invitation`, stamped best-effort the first time an invitee lands on the guest preview via their invite link (in `handleInviteLanding`). Expose it in the invitations-list API and render a compact Sent · Opened funnel line plus a Resend button in `ManageMembersModal`. Resend reuses the existing `POST /api/collections/[id]/invite` (no new endpoint).

**Tech Stack:** Prisma/Postgres (hand-authored migration), Next.js route handlers, React + MUI, Vitest + Testing Library (happy-dom).

**Branch:** `feat/sender-funnel` (already checked out; spec committed).

**Spec:** `docs/superpowers/specs/2026-07-26-sender-funnel-design.md`

---

## File Structure

- **Modify** `prisma/schema.prisma` — `openedAt DateTime?` on `Invitation`.
- **New** `prisma/migrations/20260726000000_add_invitation_opened_at/migration.sql` — the column.
- **Modify** `src/lib/invite.ts` — stamp `openedAt` in `handleInviteLanding`'s guest-preview branch.
- **Modify** `src/app/api/collections/[id]/invitations/route.ts` — expose `openedAt`.
- **Modify** `src/components/ManageMembersModal.tsx` — `Invitation` type, funnel line, Resend button + handler.
- **Tests:** `src/lib/__tests__/invite.test.ts` (extend), new `src/app/api/collections/[id]/invitations/__tests__/route.test.ts`, new `src/components/__tests__/ManageMembersModal.funnel.test.tsx`.

---

## Task 1: Schema + migration for `openedAt`

Add the nullable column and regenerate the Prisma client so later tasks compile. Migrations here are hand-authored SQL (no live DB needed); `prisma generate` reads the schema only.

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260726000000_add_invitation_opened_at/migration.sql`

- [ ] **Step 1: Add the column to the schema**

In `prisma/schema.prisma`, in `model Invitation`, add `openedAt` alongside the other timestamps (next to `sentAt`/`acceptedAt`):

```prisma
  sentAt         DateTime?
  openedAt       DateTime?
  acceptedAt     DateTime?
```

- [ ] **Step 2: Hand-author the migration**

Create `prisma/migrations/20260726000000_add_invitation_opened_at/migration.sql`:

```sql
-- AlterTable
ALTER TABLE "public"."invitations" ADD COLUMN     "openedAt" TIMESTAMP(3);
```

- [ ] **Step 3: Regenerate the Prisma client**

Run: `npx prisma generate`
Expected: "Generated Prisma Client" with no error (reads schema; needs no DB).

- [ ] **Step 4: Validate schema + typecheck**

Run: `npx prisma validate && npm run typecheck`
Expected: schema valid; typecheck passes (nothing references `openedAt` yet, so this just confirms the client regenerated cleanly).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma "prisma/migrations/20260726000000_add_invitation_opened_at/migration.sql"
git commit -m "feat(invites): add Invitation.openedAt for the sender funnel"
```

---

## Task 2: Stamp `openedAt` on the guest-preview landing

The invitee viewing the library is the "opened" signal. Stamp it best-effort in the **signed-out guest-preview branch only** — the owner/already-member tests assert `invitation.updateMany` is NOT called on their branches, so the stamp must not move earlier than the session split.

**Files:**

- Modify: `src/lib/invite.ts`
- Test: `src/lib/__tests__/invite.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/lib/__tests__/invite.test.ts`, the `handleInviteLanding` describe block already has an "unauthenticated invitee gets invite cookies and the guest preview (front porch)" test. Extend it and add a best-effort test. Replace the existing front-porch test (currently at the end of the describe) with these two:

```ts
it('unauthenticated invitee gets invite cookies, the guest preview, and is marked opened', async () => {
  mockInvitationFindFirst.mockResolvedValue({
    libraryId: 'c1',
    expiresAt: new Date(Date.now() + 86400000),
    email: 'dave@example.com',
  });
  mockGetServerSession.mockResolvedValue(null);
  const res = await handleInviteLanding(
    { url: 'https://x/j/tok' } as any,
    'tok'
  );
  expect(res.status).toBe(307);
  expect(res.headers.get('location')).toContain('/library/c1?guest=1');
  expect(res.cookies.get('invite_token')?.value).toBe('tok');
  expect(res.cookies.get('invite_library')?.value).toBe('c1');
  // First view is stamped, keyed by token, only when not already opened.
  expect(mockInvitationUpdateMany).toHaveBeenCalledWith({
    where: { token: 'tok', openedAt: null },
    data: { openedAt: expect.any(Date) },
  });
});

it('a failed opened-stamp never costs the invitee their guest preview', async () => {
  mockInvitationFindFirst.mockResolvedValue({
    libraryId: 'c1',
    expiresAt: new Date(Date.now() + 86400000),
    email: 'dave@example.com',
  });
  mockGetServerSession.mockResolvedValue(null);
  mockInvitationUpdateMany.mockRejectedValue(new Error('db blip'));
  const res = await handleInviteLanding(
    { url: 'https://x/j/tok' } as any,
    'tok'
  );
  // The stamp failed but the landing still lands.
  expect(res.status).toBe(307);
  expect(res.headers.get('location')).toContain('/library/c1?guest=1');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/invite.test.ts -t "opened"`
Expected: the first new test FAILS (`updateMany` not called with the openedAt args); the best-effort test currently passes only incidentally — both will pass after Step 3.

- [ ] **Step 3: Stamp in the guest-preview branch**

In `src/lib/invite.ts`, find the guest-preview branch of `handleInviteLanding` (the signed-out path that builds `new URL(\`/library/${libId}?guest=1\`, ...)`and calls`setInviteCookies`). Immediately before constructing that `res`, add the best-effort stamp:

```ts
// "Opened" = the invitee clicked their link and is looking at the library.
// First view wins (openedAt: null in the WHERE); best-effort — a stamp
// failure must never cost the invitee their front porch, so it is caught
// here rather than falling through to the outer catch's /?invite=error.
try {
  await db.invitation.updateMany({
    where: { token, openedAt: null },
    data: { openedAt: new Date() },
  });
} catch {
  // swallow — visibility is a nicety, the landing is not
}

// The front porch: a signed-out invitee sees the guest preview, exactly
```

(The existing `// The front porch:` comment and the `const res = NextResponse.redirect(...)` that follows stay unchanged, now beneath the stamp.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/invite.test.ts`
Expected: PASS — the two new cases plus every existing `handleInviteLanding` case (owner/already-member still assert `updateMany` NOT called, because the stamp lives only in the signed-out branch).

- [ ] **Step 5: Commit**

```bash
git add src/lib/invite.ts src/lib/__tests__/invite.test.ts
git commit -m "feat(invites): mark an invitation opened when the invitee views the library"
```

---

## Task 3: Expose `openedAt` in the invitations-list API

**Files:**

- Modify: `src/app/api/collections/[id]/invitations/route.ts`
- Test: `src/app/api/collections/[id]/invitations/__tests__/route.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `src/app/api/collections/[id]/invitations/__tests__/route.test.ts`:

```ts
import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockCollectionFindFirst = vi.hoisted(() => vi.fn());
const mockInvitationFindMany = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({
  db: {
    collection: { findFirst: mockCollectionFindFirst },
    invitation: { findMany: mockInvitationFindMany },
  },
}));

import { GET } from '../route';

function call(id = 'lib_1') {
  const request = new NextRequest(
    `http://localhost/api/collections/${id}/invitations`
  );
  return GET(request, { params: Promise.resolve({ id }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } });
  mockCollectionFindFirst.mockResolvedValue({ id: 'lib_1' });
});

describe('GET /api/collections/[id]/invitations', () => {
  it('includes openedAt in each transformed invitation', async () => {
    const opened = new Date('2026-07-27T00:00:00.000Z');
    mockInvitationFindMany.mockResolvedValue([
      {
        id: 'inv_1',
        email: 'nora@example.com',
        status: 'SENT',
        createdAt: new Date('2026-07-26T00:00:00.000Z'),
        sentAt: new Date('2026-07-26T00:00:00.000Z'),
        openedAt: opened,
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        sender: { name: 'Marc', email: 'marc@example.com' },
        receiver: null,
      },
    ]);

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.invitations).toHaveLength(1);
    expect(body.invitations[0].openedAt).toBe(opened.toISOString());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/collections/[id]/invitations`
Expected: FAIL — `openedAt` is `undefined` on the transformed object.

- [ ] **Step 3: Add `openedAt` to the transform**

In `src/app/api/collections/[id]/invitations/route.ts`, in the `transformedInvitations` map, add the field next to `sentAt`/`acceptedAt`:

```ts
      sentAt: invitation.sentAt,
      openedAt: invitation.openedAt,
      acceptedAt: invitation.acceptedAt,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/collections/[id]/invitations`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/collections/[id]/invitations/route.ts" "src/app/api/collections/[id]/invitations/__tests__/route.test.ts"
git commit -m "feat(invites): surface openedAt in the library invitations API"
```

---

## Task 4: Funnel line + Resend in `ManageMembersModal`

**Files:**

- Modify: `src/components/ManageMembersModal.tsx`
- Test: `src/components/__tests__/ManageMembersModal.funnel.test.tsx` (new)

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/ManageMembersModal.funnel.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ManageMembersModal } from '../ManageMembersModal';

const INVITES = [
  {
    id: 'inv_open',
    email: 'nora@example.com',
    status: 'SENT',
    createdAt: '2026-07-26T00:00:00.000Z',
    sentAt: '2026-07-26T00:00:00.000Z',
    openedAt: '2026-07-27T00:00:00.000Z',
    isExpired: false,
    sender: { name: 'Marc', email: 'marc@example.com' },
  },
  {
    id: 'inv_unopened',
    email: 'dave@example.com',
    status: 'SENT',
    createdAt: '2026-07-26T00:00:00.000Z',
    sentAt: '2026-07-26T00:00:00.000Z',
    openedAt: null,
    isExpired: false,
    sender: { name: 'Marc', email: 'marc@example.com' },
  },
  {
    id: 'inv_joined',
    email: 'jo@example.com',
    status: 'ACCEPTED',
    createdAt: '2026-07-26T00:00:00.000Z',
    sentAt: '2026-07-26T00:00:00.000Z',
    openedAt: null,
    isExpired: false,
    sender: { name: 'Marc', email: 'marc@example.com' },
  },
];

// URL+method-aware fetch: GET endpoints the modal hits on open, plus the
// invite POST that Resend reuses.
function stubFetch(onInvitePost?: (body: unknown) => void) {
  const fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
    if (url.endsWith('/invite') && opts?.method === 'POST') {
      onInvitePost?.(JSON.parse(String(opts.body)));
      return { ok: true, json: async () => ({ success: true }) } as Response;
    }
    if (url.endsWith('/invitations')) {
      return {
        ok: true,
        json: async () => ({ invitations: INVITES }),
      } as Response;
    }
    if (url.endsWith('/members')) {
      return { ok: true, json: async () => ({ members: [] }) } as Response;
    }
    // the /api/collections/:id limit fetch
    return { ok: true, json: async () => ({ collection: {} }) } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

function open() {
  render(
    <ManageMembersModal
      open
      onClose={() => {}}
      collectionId="lib_1"
      collectionName="HAASS"
      userRole="owner"
      initialTab={1}
    />
  );
}

describe('ManageMembersModal — sender funnel', () => {
  it('shows opened / not-opened per invite and treats accepted as opened', async () => {
    stubFetch();
    open();
    expect(await screen.findByText('nora@example.com')).toBeInTheDocument();
    // opened invite shows an "Opened <date>" line — match shape, not the exact
    // day, so the assertion survives the runner's timezone.
    expect(screen.getByText(/^Opened \d+\/\d+\/\d+$/)).toBeInTheDocument();
    // unopened invite shows the muted not-opened line
    expect(screen.getByText(/Not opened yet/)).toBeInTheDocument();
    // accepted invite reads as opened (capital "Opened"; "Not opened yet" is
    // lowercase and won't match) — nora's dated line + jo's bare "Opened" = 2.
    const openedLabels = screen.getAllByText(/Opened/);
    expect(openedLabels.length).toBeGreaterThanOrEqual(2);
  });

  it('Resend re-posts the invite email and reloads', async () => {
    let posted: unknown = null;
    stubFetch((body) => {
      posted = body;
    });
    open();
    await screen.findByText('dave@example.com');
    const resendButtons = screen.getAllByRole('button', { name: /resend/i });
    // one Resend per non-accepted invite (nora + dave), none for the accepted jo
    expect(resendButtons).toHaveLength(2);
    fireEvent.click(resendButtons[1]!); // dave's row
    await waitFor(() => expect(posted).toEqual({ email: 'dave@example.com' }));
  });

  it('hides Resend for an accepted invite', async () => {
    stubFetch();
    open();
    await screen.findByText('jo@example.com');
    // jo is ACCEPTED: its row has no Resend. Total Resend buttons = 2 (nora, dave).
    expect(screen.getAllByRole('button', { name: /resend/i })).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/ManageMembersModal.funnel.test.tsx`
Expected: FAIL — no "Opened"/"Not opened yet" text and no Resend buttons yet.

- [ ] **Step 3: Add `openedAt` to the `Invitation` interface**

In `src/components/ManageMembersModal.tsx`, extend the interface (around line 55):

```ts
interface Invitation {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  sentAt?: string;
  openedAt?: string | null;
  isExpired: boolean;
  sender?: {
    name: string;
    email: string;
  };
}
```

- [ ] **Step 4: Add the Resend handler**

In `src/components/ManageMembersModal.tsx`, immediately after the existing `handleInviteSubmit` function, add:

```ts
// Resend reuses the invite endpoint: a live invite keeps its link and just
// re-fires the email; an expired one heals with a fresh token. No note — a
// resend is a nudge, not a fresh personalized invite.
const handleResend = async (inviteEmail: string) => {
  setError(null);
  setSuccess(null);
  try {
    const response = await fetch(`/api/collections/${collectionId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail }),
    });
    const data = await response.json();
    if (response.ok) {
      setSuccess(`Invitation resent to ${inviteEmail}`);
      loadData();
    } else {
      setError(data.error || 'Failed to resend invitation');
    }
  } catch (error) {
    console.error('Failed to resend invitation:', error);
    setError('Failed to resend invitation. Please try again.');
  }
};
```

- [ ] **Step 5: Render the funnel line + Resend button**

In the pending-list row (the `<ListItem>` inside `invitations.map(...)`), the `secondary` currently shows a "Sent/Created" line and a "Sent by" line. Add the opened line into that `secondary` fragment, immediately after the "Sent/Created" `<Typography>` and before the `{invitation.sender && ...}` block:

```tsx
<Typography
  variant="caption"
  color="text.secondary"
  component="span"
  sx={{ display: 'block' }}
>
  {invitation.openedAt
    ? `Opened ${new Date(invitation.openedAt).toLocaleDateString()}`
    : invitation.status === 'ACCEPTED'
      ? 'Opened'
      : 'Not opened yet'}
</Typography>
```

Then add the Resend button. The `<ListItem>` currently ends with the status `<Chip>`. Wrap the chip and a conditional Resend button in a small flex box so they sit together at the row's end — replace the standalone `<Chip ... />` with:

```tsx
<Box
  sx={{
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  }}
>
  <Chip
    label={getStatusText(invitation.status, invitation.isExpired)}
    size="small"
    color={getStatusColor(invitation.status, invitation.isExpired)}
    variant={invitation.status === 'ACCEPTED' ? 'filled' : 'outlined'}
  />
  {invitation.status !== 'ACCEPTED' && (
    <Button
      size="small"
      variant="text"
      onClick={() => handleResend(invitation.email)}
    >
      Resend
    </Button>
  )}
</Box>
```

(`Box`, `Chip`, and `Button` are already imported in this file.)

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/ManageMembersModal.funnel.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 7: Run the other ManageMembersModal tests (shared file)**

Run: `npx vitest run src/components/__tests__/ManageMembersModal`
Expected: PASS — the existing note test is unaffected (Resend/openedAt are additive).

- [ ] **Step 8: Commit**

```bash
git add src/components/ManageMembersModal.tsx src/components/__tests__/ManageMembersModal.funnel.test.tsx
git commit -m "feat(invites): show opened + a Resend control in the pending list"
```

---

## Task 5: Whole-suite verification + PR

**Files:** none (verification only)

- [ ] **Step 1: Full unit suite**

Run: `npm run test:unit`
Expected: PASS — no new failures (compare against the known pre-existing failures in the infra-gotchas memory; this change adds none).

- [ ] **Step 2: Typecheck, lint, build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: PASS — `build` also catches the Next generated-types constraint that `typecheck` alone misses.

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin feat/sender-funnel
```

Open a PR off `main` titled `feat(invites): sender-side funnel — opened-tracking + resend (sub-project E)`. Summarize: the `openedAt` column + best-effort stamp on the guest-preview landing, the list-API field, and the pending-list funnel line + Resend (reusing the invite endpoint). Note the deliberate scope: no cancel, sender-only, resend drops the note by design.

---

## Self-Review Notes

- **Spec coverage:** `openedAt` schema/migration (Task 1) ✓; guest-preview stamp, first-view-wins, best-effort (Task 2) ✓; list API field (Task 3) ✓; funnel line + accepted-implies-opened + Resend + hidden-when-accepted (Task 4) ✓; full-suite gate (Task 5) ✓. Out-of-scope items (cancel, DECLINED, timeline redesign, email pixel, #504, share-link labels) absent by construction.
- **Placement guard:** the stamp is in the signed-out guest-preview branch only — verified against `invite.test.ts` cases that assert `updateMany` is NOT called on the owner/already-member (signed-in) branches. Moving it earlier would break those.
- **Type consistency:** API returns `openedAt` (Date → ISO string over JSON); the component's `Invitation.openedAt` is `string | null` and read via `new Date(...)`; the stamp WHERE uses `{ token, openedAt: null }` matching the test assertion.
- **Resend contract:** the button POSTs `{ email }` to `/api/collections/[id]/invite` — the same endpoint/shape `handleInviteSubmit` uses (minus the note) — so it rides the existing, tested re-invite behavior.

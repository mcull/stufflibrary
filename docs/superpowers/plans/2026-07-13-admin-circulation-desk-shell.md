# Admin Circulation Desk — Phase 1 (Shell + Desk) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic Tailwind admin dashboard with the validated "Circulation Desk" design (artboard 1a + chrome) from `docs/StuffLibrary admin dashboard design.zip`, wired to real data, with tabs routing to the future screens.

**Architecture:** A Next.js route group `src/app/admin/(console)/` owns the new chrome (header + tab nav) via its `layout.tsx`; `/admin/login` stays outside it. The Desk page is server-guarded, client-rendered from two admin API endpoints: a new `GET /api/admin/desk` (one-shot aggregates) and a new `GET /api/admin/circulation` (event ledger, polled every 45s). All display logic (event mapping, KPI deltas, sparkline path, budget math) lives in a pure module `src/lib/admin/desk.ts` — the house pure-modules rule: no side-effectful imports, fully unit-tested. Existing old-style admin components stay functional: MEMBERS/LIBRARIES/ITEMS tabs host them under the new chrome until later PRs restyle each screen.

**Tech Stack:** Next.js App Router, MUI `sx` + brand/vintage tokens, Prisma, vitest + testing-library. Fonts (Merriweather, Roboto Mono via `next/font`; Stampette via `src/styles/vintage-fonts.css`) and `VintageStamp` already exist.

**Design references:** `README.md` + `screenshots/1a-desk.png` in the design zip (extracted at `$CLAUDE_JOB_DIR/tmp/admin-design/design_handoff_admin_dashboard/`). Decisions already made with Marc: **no Waitlist anywhere** (P2P invites, not a gated beta); 5th KPI = **Invites (sent → accepted, 30d)**; **Reports has no tab** — it lives as a count row in "On the Desk"; Audit tab ships as the designed placeholder blockout; Borrows tab is a placeholder card until the state-board PR.

**Honesty rules (non-negotiable):** no fabricated data. System Health shows only what `/api/health` actually reports. On the Desk shows only counts that exist (open reports, active disputes, overdue borrows — there is NO persistent flagged-watercolor model yet, so no flagged row). Paint budget = real `AuditLog` AI_RENDER aggregates + the real Redis daily spend counter.

---

## File Map

| File                                                            | Role                                                                                                                              |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/admin/console/tokens.ts`                        | Create — console palette additions (stamp red, ok green, borders, row states, muted text tiers) on top of `brandColors`/`vintage` |
| `src/lib/admin/desk.ts`                                         | Create — PURE: types, `formatDelta`, `mapCirculationEvent`, `sparklinePath`, `paintBudgetView`, `isTabActive`                     |
| `src/lib/admin/__tests__/desk.test.ts`                          | Create — unit tests for the pure module                                                                                           |
| `src/app/api/admin/desk/route.ts`                               | Create — KPI/growth/on-desk/paint aggregates                                                                                      |
| `src/app/api/admin/desk/__tests__/route.test.ts`                | Create — route test (mock `requireAdminAuth` + `db`)                                                                              |
| `src/app/api/admin/circulation/route.ts`                        | Create — merged event ledger                                                                                                      |
| `src/app/api/admin/circulation/__tests__/route.test.ts`         | Create — route test                                                                                                               |
| `src/app/admin/(console)/layout.tsx`                            | Create — server admin guard + `ConsoleShell`                                                                                      |
| `src/components/admin/console/ConsoleShell.tsx`                 | Create — header (wordmark, ADMIN · CIRCULATION DESK, date stamp, ticking clock, avatar) + tab nav                                 |
| `src/app/admin/(console)/page.tsx`                              | Create (replaces old `src/app/admin/page.tsx` content) — the Desk                                                                 |
| `src/components/admin/console/DeskClient.tsx`                   | Create — fetches `/api/admin/desk` + polls `/api/admin/circulation`; composes cards                                               |
| `src/components/admin/console/cards.tsx`                        | Create — `ConsoleCard`, `KpiCard`, `StampChip` (Stampette wrapper w/ console sizes)                                               |
| `src/components/admin/console/CirculationLedger.tsx`            | Create — event rows + new-row flash                                                                                               |
| `src/components/admin/console/GrowthPulse.tsx`                  | Create — SVG sparkline + 4 stats                                                                                                  |
| `src/components/admin/console/SystemHealthCard.tsx`             | Create — restyled `/api/health` view                                                                                              |
| `src/components/admin/console/OnTheDesk.tsx`, `PaintBudget.tsx` | Create — right-column cards                                                                                                       |
| `src/app/admin/(console)/members/page.tsx`                      | Create — chrome + existing `AdminUserManagement` (temp)                                                                           |
| `src/app/admin/(console)/libraries/page.tsx`                    | Create — chrome + existing `LibraryManagement` (temp)                                                                             |
| `src/app/admin/(console)/items/page.tsx`                        | Create — chrome + existing `ItemManagement` (temp)                                                                                |
| `src/app/admin/(console)/borrows/page.tsx`                      | Create — honest blockout card ("state board lands in the borrows PR")                                                             |
| `src/app/admin/(console)/audit/page.tsx`                        | Create — the designed 2g placeholder (no fake data)                                                                               |
| `src/app/admin/page.tsx`                                        | Delete (superseded by `(console)/page.tsx`; same URL)                                                                             |
| `src/components/admin/console/__tests__/*.test.tsx`             | Create — light component tests                                                                                                    |

`/admin/login`, `/admin/analytics`, `/admin/security` remain untouched outside the group. Remember the repo gotcha: after moving/deleting App Router files, `rm -rf .next` before `tsc`.

---

### Task 1: Console tokens

**Files:** Create `src/components/admin/console/tokens.ts`

- [ ] **Step 1: Write the module** (no test — constants only, same as `vintageTokens.ts` precedent)

```ts
// Palette additions for the admin "Circulation Desk" (design handoff
// docs/StuffLibrary admin dashboard design.zip). Core palette lives in
// brandTokens/vintageTokens; these are the console-only inks and papers.
export const console_ = {
  inkHover: '#162C4A',
  stampRed: '#B3261E',
  okGreen: '#1E6E42',
  darkMustardText: '#8B6A00',
  cardBorder: '#E6E0CE',
  dashedLine: '#DCD5BF',
  dashedLineFaint: '#ECE5D2',
  rowHover: '#FBF8EE',
  rowSelected: '#F4EEDD',
  rowFlash: '#FFF6D8',
  textSecondary: '#55503F',
  textMuted: '#8A8371',
  textFaint: '#A99F84',
} as const;

export const consoleType = {
  overline: {
    fontFamily: '"Roboto Mono", monospace',
    fontSize: '10px',
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
  },
  kpiNumeral: {
    fontFamily: 'Merriweather, Georgia, serif',
    fontWeight: 900,
    fontSize: '30px',
  },
} as const;
```

- [ ] **Step 2: Commit** — `git commit -m "feat(admin): console palette + type tokens for the Circulation Desk"`

### Task 2: Pure desk module (TDD)

**Files:** Create `src/lib/admin/desk.ts`, `src/lib/admin/__tests__/desk.test.ts`

PURE module — no imports beyond types. This is the testable heart.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';

import {
  formatDelta,
  isTabActive,
  mapCirculationEvent,
  paintBudgetView,
  sparklinePath,
  type RawCirculationEvent,
} from '@/lib/admin/desk';

describe('formatDelta', () => {
  it('formats positive deltas with a plus and period', () => {
    expect(formatDelta(12, 'this week')).toBe('+12 this week');
  });
  it('renders zero as steady', () => {
    expect(formatDelta(0, 'this week')).toBe('steady this week');
  });
  it('keeps negatives honest', () => {
    expect(formatDelta(-3, 'this month')).toBe('-3 this month');
  });
});

describe('mapCirculationEvent', () => {
  const base = { id: 'e1', at: new Date('2026-07-13T18:04:00Z') };
  it('maps a borrow to a BORROWED ink stamp', () => {
    const raw: RawCirculationEvent = {
      ...base,
      kind: 'borrow',
      actor: 'Tom B.',
      subject: 'Pressure washer',
      detail: 'Oak Hollow · due in 7 days',
    };
    const row = mapCirculationEvent(raw);
    expect(row.text).toBe('Tom B. borrowed Pressure washer');
    expect(row.stamp).toEqual({ label: 'BORROWED', tone: 'ink' });
  });
  it('maps a return to a red RETURNED stamp', () => {
    const row = mapCirculationEvent({
      ...base,
      kind: 'return',
      actor: 'Nora F.',
      subject: 'Waffle iron',
      detail: 'Elm Park · condition: good',
    });
    expect(row.text).toBe('Nora F. returned Waffle iron');
    expect(row.stamp).toEqual({ label: 'RETURNED', tone: 'red' });
  });
  it('maps joins, renders, and invites', () => {
    expect(
      mapCirculationEvent({
        ...base,
        kind: 'join',
        actor: 'Priya S.',
        subject: 'Stonegate',
      }).stamp
    ).toEqual({ label: 'NEW MEMBER', tone: 'mustard' });
    expect(
      mapCirculationEvent({
        ...base,
        kind: 'render',
        subject: 'Air mattress',
        detail: '$0.03 · gemini-2.5-flash',
      }).stamp
    ).toEqual({ label: 'PAINTED', tone: 'green' });
    expect(
      mapCirculationEvent({
        ...base,
        kind: 'invite',
        actor: 'Grace W.',
        subject: 'Stonegate',
      }).stamp
    ).toEqual({ label: 'INVITED', tone: 'ink' });
  });
});

describe('sparklinePath', () => {
  it('spans the full width and stays inside the box', () => {
    const d = sparklinePath([0, 5, 10], 100, 40);
    expect(d).toBe('M 0 38 L 50 20 L 100 2');
  });
  it('draws a flat midline when all values are equal', () => {
    expect(sparklinePath([3, 3], 100, 40)).toBe('M 0 20 L 100 20');
  });
  it('returns empty for fewer than 2 points', () => {
    expect(sparklinePath([7], 100, 40)).toBe('');
  });
});

describe('paintBudgetView', () => {
  it('derives dollars, pct, and per-render cost', () => {
    const v = paintBudgetView({
      monthCents: 1516,
      capCents: 5000,
      renders: 504,
    });
    expect(v.monthLabel).toBe('$15.16');
    expect(v.capLabel).toBe('$50.00');
    expect(v.pct).toBe(30);
    expect(v.perRenderLabel).toBe('$0.03');
  });
  it('clamps pct at 100 and survives zero renders', () => {
    const v = paintBudgetView({ monthCents: 9000, capCents: 5000, renders: 0 });
    expect(v.pct).toBe(100);
    expect(v.perRenderLabel).toBe('—');
  });
});

describe('isTabActive', () => {
  it('matches the desk root exactly', () => {
    expect(isTabActive('/admin', '/admin')).toBe(true);
    expect(isTabActive('/admin/members', '/admin')).toBe(false);
  });
  it('matches sub-tabs by prefix', () => {
    expect(isTabActive('/admin/members', '/admin/members')).toBe(true);
    expect(isTabActive('/admin/members/abc', '/admin/members')).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/lib/admin` → FAIL (module not found)
- [ ] **Step 3: Implement**

```ts
// Pure display logic for the admin Circulation Desk. No side-effectful
// imports (house rule: pure helpers get pure modules).

export type StampTone = 'ink' | 'red' | 'mustard' | 'green';

export type CirculationKind =
  | 'borrow'
  | 'return'
  | 'join'
  | 'render'
  | 'invite'
  | 'request';

export interface RawCirculationEvent {
  id: string;
  at: Date | string;
  kind: CirculationKind;
  actor?: string | undefined;
  subject?: string | undefined;
  detail?: string | undefined;
}

export interface CirculationRow {
  id: string;
  at: string; // ISO
  text: string;
  sub: string;
  stamp: { label: string; tone: StampTone };
}

const KIND_VIEW: Record<
  CirculationKind,
  {
    verb: (a: string | undefined, s: string | undefined) => string;
    label: string;
    tone: StampTone;
  }
> = {
  borrow: {
    verb: (a, s) => `${a} borrowed ${s}`,
    label: 'BORROWED',
    tone: 'ink',
  },
  request: {
    verb: (a, s) => `${a} asked to borrow ${s}`,
    label: 'REQUESTED',
    tone: 'ink',
  },
  return: {
    verb: (a, s) => `${a} returned ${s}`,
    label: 'RETURNED',
    tone: 'red',
  },
  join: {
    verb: (a, s) => `${a} joined ${s}`,
    label: 'NEW MEMBER',
    tone: 'mustard',
  },
  render: {
    verb: (_a, s) => `Watercolor rendered · ${s}`,
    label: 'PAINTED',
    tone: 'green',
  },
  invite: {
    verb: (a, s) => `${a} invited a neighbor`,
    label: 'INVITED',
    tone: 'ink',
  },
};

export function mapCirculationEvent(raw: RawCirculationEvent): CirculationRow {
  const view = KIND_VIEW[raw.kind];
  return {
    id: raw.id,
    at: new Date(raw.at).toISOString(),
    text: view.verb(raw.actor, raw.subject),
    sub: raw.detail ?? (raw.kind === 'invite' ? (raw.subject ?? '') : ''),
    stamp: { label: view.label, tone: view.tone },
  };
}

export function formatDelta(delta: number, period: string): string {
  if (delta === 0) return `steady ${period}`;
  return `${delta > 0 ? '+' : ''}${delta} ${period}`;
}

/** Polyline path for the growth sparkline; 2px inset so the stroke survives the viewBox. */
export function sparklinePath(
  values: number[],
  width: number,
  height: number
): string {
  if (values.length < 2) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const inset = 2;
  const step = width / (values.length - 1);
  return values
    .map((v, i) => {
      const x = Math.round(i * step * 100) / 100;
      const y =
        span === 0
          ? height / 2
          : Math.round(
              (inset + (1 - (v - min) / span) * (height - inset * 2)) * 100
            ) / 100;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function paintBudgetView(input: {
  monthCents: number;
  capCents: number;
  renders: number;
}) {
  const pct =
    input.capCents > 0
      ? Math.min(100, Math.round((input.monthCents / input.capCents) * 100))
      : 0;
  return {
    monthLabel: dollars(input.monthCents),
    capLabel: dollars(input.capCents),
    pct,
    perRenderLabel:
      input.renders > 0 ? dollars(input.monthCents / input.renders) : '—',
    rendersLabel: `${input.renders} renders this month`,
  };
}

export function isTabActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}
```

Note: `perRenderLabel` for the clamp test computes `dollars(9000/0)` — guard with the `renders > 0` ternary shown; and `$0.03` comes from `1516/504 = 3.008…` cents → `(3.008/100).toFixed(2)`.

- [ ] **Step 4: Run to green** — `npx vitest run src/lib/admin` → PASS
- [ ] **Step 5: Commit** — `feat(admin): pure desk module — event mapping, deltas, sparkline, paint budget`

### Task 3: `/api/admin/desk` aggregates route (TDD)

**Files:** Create `src/app/api/admin/desk/route.ts`, `src/app/api/admin/desk/__tests__/route.test.ts`

Follow the existing admin route-test pattern (see `src/app/api/admin/reports/__tests__/route.test.ts`): `vi.mock('@/lib/admin-auth')` and `vi.mock('@/lib/db')`.

- [ ] **Step 1: Write failing test** — mock counts, call `GET()`, assert JSON shape:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/admin-auth', () => ({
  requireAdminAuth: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/redis', () => ({ redis: null }));
const counts = {
  user: vi.fn(),
  collection: vi.fn(),
  item: vi.fn(),
  borrowRequest: vi.fn(),
  invitation: vi.fn(),
  userReport: vi.fn(),
  dispute: vi.fn(),
};
vi.mock('@/lib/db', () => ({
  db: {
    user: {
      count: (...a: unknown[]) => counts.user(...a),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    collection: { count: (...a: unknown[]) => counts.collection(...a) },
    item: { count: (...a: unknown[]) => counts.item(...a) },
    borrowRequest: { count: (...a: unknown[]) => counts.borrowRequest(...a) },
    invitation: { count: (...a: unknown[]) => counts.invitation(...a) },
    userReport: { count: (...a: unknown[]) => counts.userReport(...a) },
    dispute: { count: (...a: unknown[]) => counts.dispute(...a) },
    $queryRaw: vi.fn().mockResolvedValue([{ month_cents: 1516, renders: 504 }]),
  },
}));

import { GET } from '../route';

describe('GET /api/admin/desk', () => {
  beforeEach(() => {
    Object.values(counts).forEach((m) => m.mockResolvedValue(7));
  });
  it('returns kpis, onDesk, growth, and paint blocks', async () => {
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.kpis).toMatchObject({
      members: 7,
      activeLibraries: 7,
      itemsOnShelves: 7,
    });
    expect(body.onDesk).toMatchObject({
      openReports: 7,
      activeDisputes: 7,
      overdueBorrows: 7,
    });
    expect(body.growth.daily).toHaveLength(30);
    expect(body.paint).toMatchObject({ monthCents: 1516, renders: 504 });
  });
});
```

- [ ] **Step 2: Verify it fails**, then **Step 3: Implement the route**. Aggregates (all in one `Promise.all`):
  - `members` = `db.user.count()`; `membersWeekDelta` = users created ≥ 7d ago.
  - `activeLibraries` = `db.collection.count()`; `librariesMonthDelta` = created ≥ 30d.
  - `itemsOnShelves` = `db.item.count()`; `watercolorPct` = round(100 \* item.count({ where: { watercolorUrl: { not: null } } }) / max(1, total)).
  - `borrowsInFlight` = borrowRequest.count({ status: { in: ['APPROVED','ACTIVE','RETURN_PENDING'] } }); `overdueBorrows` = count({ status: 'ACTIVE', dueDate: { lt: new Date() } }) — **verify the actual due-date field name in `prisma/schema.prisma` (`dueDate` vs `requestedReturnDate`) before coding; use what the borrows model really has.**
  - `invitesSent30d` / `invitesAccepted30d` = invitation.count({ sentAt/acceptedAt ≥ 30d }).
  - `onDesk`: `openReports` = userReport.count({ status: 'PENDING' }); `activeDisputes` = dispute.count({ status: { in: ['OPEN','IN_PROGRESS'] } }); `overdueBorrows` as above.
  - `growth.daily` (30 ints): one `$queryRaw` — `SELECT date_trunc('day', "createdAt") d, count(*) c FROM users WHERE "createdAt" >= now() - interval '30 days' GROUP BY 1` → zero-fill 30 buckets in JS (pure helper `fillDailyBuckets(rows, 30, now)` added to `desk.ts` WITH a unit test: rows on days 0/29 land at both ends, missing days are 0).
  - `paint`: `$queryRaw` over `audit_logs` — `SELECT COALESCE(SUM((metadata->>'cost_cents')::int),0) month_cents, COUNT(*) renders FROM audit_logs WHERE action = 'AI_RENDER' AND "createdAt" >= date_trunc('month', now())` (**check the actual table + column casing via `@@map` in the schema first**); `capCents` = `DAILY_SPEND_CAP_CENTS` env or 1000 default — label it in the UI as the DAILY cap (that is what it is; do not present it as monthly).
- [ ] **Step 4: Green** — `npx vitest run src/app/api/admin/desk`
- [ ] **Step 5: Commit** — `feat(admin): desk aggregates endpoint`

### Task 4: `/api/admin/circulation` route (TDD)

**Files:** Create `src/app/api/admin/circulation/route.ts` + `__tests__/route.test.ts`

- [ ] **Step 1: Failing test** — mock db to return: one ACTIVE borrow (borrower name + item name + collection name via item→collection relation), one RETURNED (returnedAt), one recent user, one AI_RENDER auditLog, one sent invitation. Assert merged, sorted desc by time, and each row already shaped by `mapCirculationEvent` (i.e. body is `CirculationRow[]` with `stamp.label` values BORROWED/RETURNED/NEW MEMBER/PAINTED/INVITED).
- [ ] **Step 2/3: Implement** — 5 parallel queries (take 15 each, `orderBy` desc on the relevant timestamp), map each source to `RawCirculationEvent`:
  - borrows: `approvedAt ?? updatedAt` for ACTIVE (`kind:'borrow'`), PENDING → `kind:'request'` on `createdAt`; RETURNED → `kind:'return'` on `returnedAt ?? updatedAt`; detail = `${libraryName}${dueLabel}` (due label from requested return date when present).
  - users: `kind:'join'`, subject = their first library name if any membership exists, else `'StuffLibrary'`.
  - auditLog AI_RENDER: `kind:'render'`, subject = metadata item name if present else 'an item', detail = `$0.0X · model` from metadata cost_cents/model. Skip rows with status ≠ 'ok' — no fake successes.
  - invitations (sentAt not null): `kind:'invite'`, actor = sender name, subject = library name.
  - Merge, sort desc, slice to `limit` (default 30), map, return.
  - **Verify every relation/field name against `prisma/schema.prisma` while implementing — do not guess; the borrow model's timestamps and the invitation→collection relation name must come from the schema.**
- [ ] **Step 4: Green**, **Step 5: Commit** — `feat(admin): circulation ledger endpoint`

### Task 5: Console shell (layout + header + tabs)

**Files:** Create `src/app/admin/(console)/layout.tsx`, `src/components/admin/console/ConsoleShell.tsx`; **move** the old dashboard out of the way (`git rm src/app/admin/page.tsx` happens in Task 7 when `(console)/page.tsx` replaces it — do NOT leave both, they'd collide on `/admin`).

- [ ] **Step 1: layout.tsx** — server component: `getServerSession` + `isAdmin` guard exactly as the old `src/app/admin/page.tsx` did (redirect `/admin/login`), then `<ConsoleShell>{children}</ConsoleShell>`.
- [ ] **Step 2: ConsoleShell** (client) — per README chrome spec:
  - Header row on cream: ImpactLabel wordmark chip (reuse the GlobalHeader wordmark styling — see `src/components/GlobalHeader.tsx` for the exact chip pattern) + mono overline `ADMIN · CIRCULATION DESK` + right side: date stamp (red-ink bordered chip, rotated ~-2°, `MMM DD YYYY` uppercase), ticking `HH:MM:SS` mono clock (client `useEffect` + 1s interval; render `--:--:--` until mounted to dodge hydration mismatch), avatar circle with the session user's initial. 2px ink rule below.
  - Tab nav: DESK `/admin` · MEMBERS `/admin/members` · LIBRARIES `/admin/libraries` · ITEMS `/admin/items` · BORROWS `/admin/borrows` · AUDIT `/admin/audit`. Mono uppercase 11px; active (via `isTabActive(usePathname(), href)`) = ink #1E3A5F, 700, 3px mustard underline; inactive `#8A8371`. Real `<Link>`s. **No REPORTS tab, no WAITLIST tab.**
- [ ] **Step 3: Component test** — render `ConsoleShell` (mock `next/navigation` `usePathname` → `/admin/members`), assert MEMBERS link has the active style marker (e.g. `aria-current="page"`) and that no tab named WAITLIST or REPORTS exists.
- [ ] **Step 4: Green + commit** — `feat(admin): Circulation Desk chrome — header, clock, tab nav`

### Task 6: Card primitives

**Files:** Create `src/components/admin/console/cards.tsx`

- [ ] **Step 1:** Three small building blocks, all per README "Structure":
  - `ConsoleCard({ title, action?, children })` — white bg, 1px `console_.cardBorder`, radius 8px, padding 18px; title = mono overline with 2px ink bottom rule.
  - `KpiCard({ label, value, delta, deltaTone? })` — overline label, Merriweather-900 30px numeral, mono 10.5px delta line (green/mustard/red tone).
  - `StampChip({ label, tone, rotation? })` — thin wrapper mapping `StampTone` → ink colors (`ink` #1E3A5F, `red` #B3261E, `mustard` #8B6A00, `green` #1E6E42) onto the existing `VintageStamp` (fontSize 10, borderWidth 1.5).
- [ ] **Step 2: Test** — `KpiCard` renders value + delta; `StampChip` maps tones to colors (assert style attribute contains the ink).
- [ ] **Step 3: Commit** — `feat(admin): console card primitives`

### Task 7: The Desk page

**Files:** Create `src/app/admin/(console)/page.tsx` + `src/components/admin/console/DeskClient.tsx`, `CirculationLedger.tsx`, `GrowthPulse.tsx`, `SystemHealthCard.tsx`, `OnTheDesk.tsx`, `PaintBudget.tsx`; **Delete** `src/app/admin/page.tsx`.

- [ ] **Step 1:** `(console)/page.tsx` = server component that just renders `<DeskClient />` (guard already in layout). `git rm src/app/admin/page.tsx` in the same change; `rm -rf .next` before typechecking.
- [ ] **Step 2:** `DeskClient` — `useEffect` fetch of `/api/admin/desk` (once) and `/api/admin/circulation` (every 45s, `setInterval`, cleared on unmount). Loading = existing skeleton pattern (see `DrawerGridSkeleton` usage in `LobbyClient` for house style). Error = plain mono line "COULD NOT REACH THE DESK — refresh", no fake numbers.
  - KPI row (5): MEMBERS (`formatDelta(membersWeekDelta,'this week')`), ACTIVE LIBRARIES, ITEMS ON SHELVES (`{watercolorPct}% with watercolors`), BORROWS IN FLIGHT (`{overdueBorrows} overdue`, red tone when > 0), INVITES 30D (`{accepted} accepted`).
  - Grid: left 2fr (Today's Circulation, Growth Pulse), right 1fr (System Health, On the Desk, Paint Budget) — `gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 2fr) minmax(0, 1fr)' }` (the #482 lesson: never bare `fr` next to nowrap mono text).
- [ ] **Step 3:** `CirculationLedger` — rows: mono time (HH:MM), text + sub, `StampChip` right. New rows (ids not in previous poll) get `rowFlash` bg fading over ~800ms (CSS transition from `#FFF6D8` to transparent via a `data-fresh` attr toggled off in a `requestAnimationFrame`) and stamp scale 1.18→1. Empty state: "Nothing in circulation yet today — quiet desk." (true at soft-launch scale).
- [ ] **Step 4:** `GrowthPulse` — `<svg viewBox="0 0 560 120">`: area fill (path + `L width height L 0 height Z`, ink at 7% opacity), 1.5px ink polyline from `sparklinePath(growth.daily, 560, 120)`, coral 3px end dot at the last point. Stats row: signups today · invites accepted % (30d) · invites pending · new libraries / wk.
- [ ] **Step 5:** `SystemHealthCard` — fetch `/api/health` like the old `SystemHealth.tsx` did (keep data source, replace UI): row per service it reports, green/red dot + mono value (latency where provided). All healthy → green `ALL SYSTEMS NOMINAL` VintageStamp; anything down → red `ATTENTION` stamp. Show ONLY services `/api/health` actually returns — read its response shape from `src/app/api/health/route.ts` while implementing; no Twilio/Resend rows unless the endpoint reports them.
- [ ] **Step 6:** `OnTheDesk` — three link rows: Open reports → `/admin/analytics#reports` (count pill, coral when > 0), Active disputes, Overdue borrows → `/admin/borrows`. `PaintBudget` — from `paintBudgetView`: big `$X.XX` + "of $N daily cap", mustard progress bar (`pct`), sub-line `~$0.0X per render · N renders this month`.
- [ ] **Step 7: Component test** — `DeskClient` with mocked `fetch` (both endpoints): KPI values render; ledger renders mapped rows; no element ever renders the string "Waitlist".
- [ ] **Step 8: Full check** — `rm -rf .next && npx tsc --noEmit && npx vitest run` → green. **Commit** — `feat(admin): the Desk — KPIs, circulation ledger, growth pulse, health, paint budget`

### Task 8: Carry-over tabs (function preserved, restyle later)

**Files:** Create `(console)/members/page.tsx`, `(console)/libraries/page.tsx`, `(console)/items/page.tsx`, `(console)/borrows/page.tsx`, `(console)/audit/page.tsx`

- [ ] **Step 1:** members/libraries/items — each page: a `ConsoleCard` note "Old console — the Circulation Desk restyle for this screen is queued" above the existing component (`AdminUserManagement` / `LibraryManagement` / `ItemManagement`) rendered as-is. They're client components fetching their own data; no data work.
- [ ] **Step 2:** borrows — dashed-border `ConsoleCard`: overline `BORROW BOARD — QUEUED`, one honest sentence, rotated mustard `PLACEHOLDER` VintageStamp. No fake columns.
- [ ] **Step 3:** audit — the designed 2g blockout exactly: dashed card, `AUDIT LEDGER — BLOCKED OUT` overline, explanation copy, rotated PLACEHOLDER stamp, ghost table (TIME/ACTOR/ACTION/TARGET/DETAIL headers + 4 rows of grey skeleton bars, opacity fading down), `WILL RECORD:` chips (Admin actions · Security events · System jobs · Append-only, exportable). No fake data.
- [ ] **Step 4: Green + commit** — `feat(admin): console tabs — carried-over tools + honest placeholders`

### Task 9: Final verification

- [ ] `rm -rf .next && npx tsc --noEmit` — clean
- [ ] `npx vitest run` — full suite green (2 known skips only)
- [ ] `npx next build` — clean
- [ ] `npm run dev` + Chrome: sign in as admin → `/admin` shows the Desk with REAL data (local DB); click every tab; `/admin/login` has no chrome; clock ticks; no "Waitlist" string anywhere in the console (grep the built page too: `grep -ri waitlist src/components/admin/console src/app/admin` → empty)
- [ ] Commit any fixes; push; PR titled `feat(admin): Circulation Desk — shell + Desk dashboard (phase 1)` with Field-Note trailers; screenshots of Desk in the PR body

## Self-review notes

- Spec coverage: 1a fully tasked (KPIs T7.2, ledger T7.3, growth T7.4, health T7.5, on-desk/paint T7.6); chrome T5; 2g T8.3; 2b/2a/2c carried over functionally T8.1; 2d honest placeholder T8.2; 2e demoted to On-the-Desk counts (decision recorded in header); 2f intentionally absent everywhere (tested in T5.3 and T7.7).
- Deviations from the design README, all deliberate: no Waitlist KPI/tab (product truth), no flagged-watercolors row (no persistent model — honesty rule), paint budget labeled as the daily cap (that's what `DAILY_SPEND_CAP_CENTS` is), no SSE (45s polling fits soft-launch scale; README allows it), no Twilio/Resend health rows unless `/api/health` reports them.
- Type consistency: `StampTone`/`CirculationRow`/`RawCirculationEvent` defined once in Task 2 and imported everywhere; `console_`/`consoleType` from Task 1; `isTabActive` used in Task 5.
- Field-name caution flags are explicit in Tasks 3/4 (borrow due-date field, audit_logs table casing, invitation relations) — implementer must read `prisma/schema.prisma`, not trust this doc.

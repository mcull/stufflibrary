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
    verb: (a) => `${a} invited a neighbor`,
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

/**
 * Ledger timestamps, honestly: an event from today reads as a wall-clock
 * time ('14:24'); anything older reads as a date ('Jul 11') so stale
 * events never masquerade as fresh ones.
 */
export function ledgerTimeLabel(atIso: string, now: Date): string {
  const at = new Date(atIso);
  const sameLocalDay =
    at.getFullYear() === now.getFullYear() &&
    at.getMonth() === now.getMonth() &&
    at.getDate() === now.getDate();
  if (sameLocalDay) {
    return [at.getHours(), at.getMinutes()]
      .map((n) => String(n).padStart(2, '0'))
      .join(':');
  }
  return at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDelta(delta: number, period: string): string {
  if (delta === 0) return `steady ${period}`;
  return `${delta > 0 ? '+' : ''}${delta} ${period}`;
}

const SPARK_INSET = 2;

function sparkY(v: number, min: number, span: number, height: number): number {
  return span === 0
    ? height / 2
    : Math.round(
        (SPARK_INSET + (1 - (v - min) / span) * (height - SPARK_INSET * 2)) *
          100
      ) / 100;
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
  const step = width / (values.length - 1);
  return values
    .map((v, i) => {
      const x = Math.round(i * step * 100) / 100;
      return `${i === 0 ? 'M' : 'L'} ${x} ${sparkY(v, min, span, height)}`;
    })
    .join(' ');
}

/** Coordinates of the sparkline's last point (for the coral end-dot). */
export function sparklineEndpoint(
  values: number[],
  width: number,
  height: number
): { x: number; y: number } | null {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const last = values[values.length - 1]!;
  return { x: width, y: sparkY(last, min, max - min, height) };
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

/** `'Mar 2026'` — how a roster remembers a join date. */
export function monthYearLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Trust bar ink: ≥70 green, 45–69 ink, below 45 red. */
export function trustBarColor(score: number): 'green' | 'ink' | 'red' {
  if (score >= 70) return 'green';
  if (score >= 45) return 'ink';
  return 'red';
}

/** How long a member counts as NEW — the roster stamp and its filter chip agree. */
export const NEW_MEMBER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The one stamp a roster row wears (rows stay calm):
 * SUSPENDED beats NEW (joined ≤7d ago) beats OWNER (owns ≥1 library).
 */
export function memberStamp(
  user: { status: string; createdAt: string; ownedLibraries: number },
  now: Date
): { label: string; tone: StampTone } | null {
  if (user.status === 'suspended') return { label: 'SUSPENDED', tone: 'red' };
  if (
    now.getTime() - new Date(user.createdAt).getTime() <=
    NEW_MEMBER_WINDOW_MS
  ) {
    return { label: 'NEW', tone: 'mustard' };
  }
  if (user.ownedLibraries > 0) return { label: 'OWNER', tone: 'ink' };
  return null;
}

export function isTabActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

// ——— Borrows state board (artboard 2d) ———

export type BorrowBoardColumn =
  | 'requested'
  | 'out'
  | 'overdue'
  | 'returnedToday';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Which column a borrow lives in — the single source of truth for the
 * board. Overdue borrows come OUT of the out-on-loan column (never
 * double-listed); returns fall off the board 24h after returnedAt, which
 * is exactly what the footer line promises. DECLINED/CANCELLED (and a
 * RETURNED row with no returnedAt on record) have nothing honest to show.
 */
export function borrowBoardColumn(
  req: {
    status: string;
    requestedReturnDate: string | Date;
    returnedAt?: string | Date | null;
  },
  now: Date
): BorrowBoardColumn | null {
  switch (req.status) {
    case 'PENDING':
      return 'requested';
    case 'APPROVED':
    case 'ACTIVE':
    case 'RETURN_PENDING':
      return new Date(req.requestedReturnDate).getTime() < now.getTime()
        ? 'overdue'
        : 'out';
    case 'RETURNED': {
      if (!req.returnedAt) return null;
      const age = now.getTime() - new Date(req.returnedAt).getTime();
      return age < DAY_MS ? 'returnedToday' : null;
    }
    default:
      return null;
  }
}

export type NudgeKind = 'REMIND_OWNER' | 'NUDGE_BORROWER';

/**
 * A nudge (either kind) rings the same bell at most once per ~day;
 * 20h rather than 24 so a daily-rhythm admin isn't refused for being
 * four minutes early. lastOverdueReminderAt records the last admin or
 * system reminder of any kind — the throttle is shared with the cron.
 */
export const NUDGE_THROTTLE_MS = 20 * 60 * 60 * 1000;

/** How long a request may sit unanswered before the desk offers REMIND OWNER. */
export const REMIND_OWNER_AFTER_MS = DAY_MS;

/**
 * What (if anything) the desk can nudge on a borrow — the single source
 * of truth for the board's REMIND OWNER / NUDGE buttons and the nudge
 * endpoint. A PENDING request that has waited over a day can remind the
 * owner; any out-of-the-building borrow past its due date can nudge the
 * borrower. Everything else: nothing to nudge.
 */
export function nudgeDecision(
  req: {
    id: string;
    status: string;
    createdAt: string | Date;
    requestedReturnDate: string | Date;
    lastOverdueReminderAt: string | Date | null;
  },
  now: Date
): { kind: NudgeKind; throttled: boolean } | null {
  let kind: NudgeKind;
  if (
    req.status === 'PENDING' &&
    now.getTime() - new Date(req.createdAt).getTime() > REMIND_OWNER_AFTER_MS
  ) {
    kind = 'REMIND_OWNER';
  } else if (
    ['APPROVED', 'ACTIVE', 'RETURN_PENDING'].includes(req.status) &&
    new Date(req.requestedReturnDate).getTime() < now.getTime()
  ) {
    kind = 'NUDGE_BORROWER';
  } else {
    return null;
  }

  const throttled =
    req.lastOverdueReminderAt !== null &&
    now.getTime() - new Date(req.lastOverdueReminderAt).getTime() <
      NUDGE_THROTTLE_MS;
  return { kind, throttled };
}

/**
 * Loan progress for the due bar: pct of the loan elapsed (clamped 0–100)
 * plus an honest label — 'due in N days', 'due today' inside the final
 * 24h, 'N days late' past due (N = ceil of whole days).
 */
export function dueMeter(
  due: string | Date,
  start: string | Date,
  now: Date
): { pct: number; label: string } {
  const dueMs = new Date(due).getTime();
  const startMs = new Date(start).getTime();
  const total = dueMs - startMs;
  const elapsed = now.getTime() - startMs;
  const pct =
    total > 0
      ? Math.min(100, Math.max(0, Math.round((100 * elapsed) / total)))
      : 100;

  const remaining = dueMs - now.getTime();
  if (remaining < 0) {
    const late = Math.ceil(-remaining / DAY_MS);
    return { pct, label: `${late} day${late === 1 ? '' : 's'} late` };
  }
  if (remaining < DAY_MS) return { pct, label: 'due today' };
  const left = Math.ceil(remaining / DAY_MS);
  return { pct, label: `due in ${left} day${left === 1 ? '' : 's'}` };
}

/**
 * The stamp a borrow line wears on the member record card. Every
 * out-of-the-building status (APPROVED/ACTIVE/RETURN_PENDING) reads OUT —
 * the same truth borrowBoardColumn tells. CANCELLED and anything the desk
 * doesn't recognize get quiet grey text instead of ink: tone null = no stamp.
 */
export function borrowStatusStamp(status: string): {
  label: string;
  tone: StampTone | null;
} {
  switch (status) {
    case 'PENDING':
      return { label: 'REQUESTED', tone: 'ink' };
    case 'APPROVED':
    case 'ACTIVE':
    case 'RETURN_PENDING':
      return { label: 'OUT', tone: 'ink' };
    case 'RETURNED':
      return { label: 'RETURNED', tone: 'green' };
    case 'DECLINED':
      return { label: 'DECLINED', tone: 'red' };
    default:
      return { label: status, tone: null };
  }
}

/** How long a request has sat unanswered: 'waiting 3h' under a day, 'waiting 2d' after. */
export function waitingLabel(createdAt: string | Date, now: Date): string {
  const ms = Math.max(0, now.getTime() - new Date(createdAt).getTime());
  if (ms < DAY_MS) return `waiting ${Math.floor(ms / (60 * 60 * 1000))}h`;
  return `waiting ${Math.floor(ms / DAY_MS)}d`;
}

/** Zero-fill `days` daily buckets ending today (UTC); rows carry a day + count. */
export function fillDailyBuckets(
  rows: Array<{ d: Date | string; c: number | bigint }>,
  days: number,
  now: Date
): number[] {
  const out = new Array<number>(days).fill(0);
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  const dayMs = 24 * 60 * 60 * 1000;
  for (const row of rows) {
    const d = new Date(row.d);
    const rowUtc = Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate()
    );
    const idx = days - 1 - Math.round((todayUtc - rowUtc) / dayMs);
    if (idx >= 0 && idx < days) out[idx] = (out[idx] ?? 0) + Number(row.c);
  }
  return out;
}

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

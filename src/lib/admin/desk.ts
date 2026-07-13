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

import { describe, expect, it } from 'vitest';

import {
  borrowBoardColumn,
  borrowStatusStamp,
  dueMeter,
  fillDailyBuckets,
  formatDelta,
  isTabActive,
  ledgerTimeLabel,
  mapCirculationEvent,
  memberStamp,
  monthYearLabel,
  trustBarColor,
  paintBudgetView,
  sparklineEndpoint,
  sparklinePath,
  waitingLabel,
  type RawCirculationEvent,
} from '@/lib/admin/desk';

describe('formatDelta', () => {
  it('formats positive deltas with a plus', () => {
    expect(formatDelta(12, 'this week')).toBe('+12 this week');
  });
  it('renders zero as steady', () => {
    expect(formatDelta(0, 'this week')).toBe('steady this week');
  });
  it('keeps negatives honest', () => {
    expect(formatDelta(-3, 'this month')).toBe('-3 this month');
  });
});

describe('ledgerTimeLabel', () => {
  it('shows wall-clock time for events from today', () => {
    const at = new Date(2026, 6, 13, 14, 24); // local Jul 13, 14:24
    const now = new Date(2026, 6, 13, 20, 0);
    expect(ledgerTimeLabel(at.toISOString(), now)).toBe('14:24');
  });
  it('shows the date for older events, never a misleading clock time', () => {
    const at = new Date(2026, 6, 11, 9, 5);
    const now = new Date(2026, 6, 13, 20, 0);
    expect(ledgerTimeLabel(at.toISOString(), now)).toBe('Jul 11');
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
    expect(row.sub).toBe('Oak Hollow · due in 7 days');
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
  it('maps joins, renders, invites, and requests', () => {
    const join = mapCirculationEvent({
      ...base,
      kind: 'join',
      actor: 'Priya S.',
      subject: 'Stonegate',
    });
    expect(join.text).toBe('Priya S. joined Stonegate');
    expect(join.stamp).toEqual({ label: 'NEW MEMBER', tone: 'mustard' });
    const render = mapCirculationEvent({
      ...base,
      kind: 'render',
      subject: 'Air mattress',
      detail: '$0.03 · gemini-2.5-flash',
    });
    expect(render.text).toBe('Watercolor rendered · Air mattress');
    expect(render.stamp).toEqual({ label: 'PAINTED', tone: 'green' });
    const invite = mapCirculationEvent({
      ...base,
      kind: 'invite',
      actor: 'Grace W.',
      subject: 'Stonegate',
    });
    expect(invite.text).toBe('Grace W. invited a neighbor');
    expect(invite.stamp).toEqual({ label: 'INVITED', tone: 'ink' });
    expect(
      mapCirculationEvent({
        ...base,
        kind: 'request',
        actor: 'Sam T.',
        subject: 'Tile saw',
      }).text
    ).toBe('Sam T. asked to borrow Tile saw');
  });
  it('emits ISO timestamps and falls back sub to subject for invites', () => {
    const row = mapCirculationEvent({
      ...base,
      kind: 'invite',
      actor: 'Grace W.',
      subject: 'Stonegate',
    });
    expect(row.at).toBe('2026-07-13T18:04:00.000Z');
    expect(row.sub).toBe('Stonegate');
  });
});

describe('sparklinePath', () => {
  it('spans the full width and stays inside the box', () => {
    expect(sparklinePath([0, 5, 10], 100, 40)).toBe('M 0 38 L 50 20 L 100 2');
  });
  it('draws a flat midline when all values are equal', () => {
    expect(sparklinePath([3, 3], 100, 40)).toBe('M 0 20 L 100 20');
  });
  it('returns empty for fewer than 2 points', () => {
    expect(sparklinePath([7], 100, 40)).toBe('');
  });
});

describe('sparklineEndpoint', () => {
  it('lands the end-dot exactly on the path terminus', () => {
    expect(sparklineEndpoint([0, 5, 10], 100, 40)).toEqual({ x: 100, y: 2 });
  });
  it('sits on the midline when values are flat', () => {
    expect(sparklineEndpoint([3, 3], 100, 40)).toEqual({ x: 100, y: 20 });
  });
  it('returns null for fewer than 2 points (matching sparklinePath)', () => {
    expect(sparklineEndpoint([7], 100, 40)).toBeNull();
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
    expect(v.rendersLabel).toBe('504 renders this month');
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

describe('borrowBoardColumn', () => {
  const now = new Date('2026-07-13T12:00:00Z');
  const future = new Date('2026-07-20T12:00:00Z');
  const past = new Date('2026-07-10T12:00:00Z');

  it('puts PENDING in the requested column', () => {
    expect(
      borrowBoardColumn({ status: 'PENDING', requestedReturnDate: future }, now)
    ).toBe('requested');
  });

  it('puts APPROVED / ACTIVE / RETURN_PENDING with a future due date in out', () => {
    for (const status of ['APPROVED', 'ACTIVE', 'RETURN_PENDING']) {
      expect(
        borrowBoardColumn({ status, requestedReturnDate: future }, now)
      ).toBe('out');
    }
  });

  it('moves any in-flight borrow past its due date to overdue (never both)', () => {
    for (const status of ['APPROVED', 'ACTIVE', 'RETURN_PENDING']) {
      expect(
        borrowBoardColumn({ status, requestedReturnDate: past }, now)
      ).toBe('overdue');
    }
  });

  it('shows RETURNED only within 24h of returnedAt', () => {
    expect(
      borrowBoardColumn(
        {
          status: 'RETURNED',
          requestedReturnDate: past,
          returnedAt: new Date('2026-07-13T02:00:00Z'),
        },
        now
      )
    ).toBe('returnedToday');
    expect(
      borrowBoardColumn(
        {
          status: 'RETURNED',
          requestedReturnDate: past,
          returnedAt: new Date('2026-07-10T02:00:00Z'),
        },
        now
      )
    ).toBeNull();
    // RETURNED with no returnedAt on record: nothing honest to show
    expect(
      borrowBoardColumn(
        { status: 'RETURNED', requestedReturnDate: past, returnedAt: null },
        now
      )
    ).toBeNull();
  });

  it('drops DECLINED and CANCELLED from the board', () => {
    for (const status of ['DECLINED', 'CANCELLED']) {
      expect(
        borrowBoardColumn({ status, requestedReturnDate: future }, now)
      ).toBeNull();
    }
  });
});

describe('dueMeter', () => {
  const day = 24 * 60 * 60 * 1000;
  const start = new Date('2026-07-06T12:00:00Z');
  const due = new Date('2026-07-16T12:00:00Z'); // 10-day loan

  it('reads mid-loan progress and days remaining', () => {
    const now = new Date('2026-07-13T12:00:00Z'); // 7 of 10 days elapsed
    expect(dueMeter(due, start, now)).toEqual({
      pct: 70,
      label: 'due in 3 days',
    });
  });

  it('says due today inside the final 24 hours', () => {
    const now = new Date(due.getTime() - day / 2);
    const meter = dueMeter(due, start, now);
    expect(meter.label).toBe('due today');
    expect(meter.pct).toBe(95);
  });

  it('counts days late past due and clamps the bar at 100', () => {
    const now = new Date(due.getTime() + 2.5 * day);
    expect(dueMeter(due, start, now)).toEqual({
      pct: 100,
      label: '3 days late',
    });
    expect(dueMeter(due, start, new Date(due.getTime() + day)).label).toBe(
      '1 day late'
    );
  });
});

describe('waitingLabel', () => {
  const now = new Date('2026-07-13T12:00:00Z');
  it('counts hours under a day', () => {
    expect(waitingLabel(new Date('2026-07-13T08:30:00Z'), now)).toBe(
      'waiting 3h'
    );
  });
  it('switches to days after 24h', () => {
    expect(waitingLabel(new Date('2026-07-11T06:00:00Z'), now)).toBe(
      'waiting 2d'
    );
  });
});

describe('fillDailyBuckets', () => {
  const now = new Date('2026-07-13T12:00:00Z');
  it('zero-fills 30 buckets and lands counts on the right days', () => {
    const rows = [
      { d: new Date('2026-07-13T00:00:00Z'), c: 4 },
      { d: new Date('2026-06-14T00:00:00Z'), c: 2 },
    ];
    const out = fillDailyBuckets(rows, 30, now);
    expect(out).toHaveLength(30);
    expect(out[29]).toBe(4); // today = last bucket
    expect(out[0]).toBe(2); // 29 days ago = first bucket
    expect(out[15]).toBe(0);
  });
  it('ignores rows outside the window', () => {
    const out = fillDailyBuckets(
      [{ d: new Date('2026-05-01T00:00:00Z'), c: 9 }],
      30,
      now
    );
    expect(out.every((v) => v === 0)).toBe(true);
  });
});

describe('monthYearLabel', () => {
  it("renders 'Mar 2026' style joined labels", () => {
    expect(monthYearLabel('2026-03-15T12:00:00Z')).toBe('Mar 2026');
  });
  it('handles January and December without off-by-one drift', () => {
    expect(monthYearLabel('2025-01-02T12:00:00Z')).toBe('Jan 2025');
    expect(monthYearLabel('2025-12-30T12:00:00Z')).toBe('Dec 2025');
  });
});

describe('trustBarColor', () => {
  it('is green from 70 up', () => {
    expect(trustBarColor(70)).toBe('green');
    expect(trustBarColor(91)).toBe('green');
  });
  it('is ink for the 45–69 middle band', () => {
    expect(trustBarColor(45)).toBe('ink');
    expect(trustBarColor(69)).toBe('ink');
  });
  it('is red below 45', () => {
    expect(trustBarColor(44)).toBe('red');
    expect(trustBarColor(0)).toBe('red');
  });
});

describe('memberStamp', () => {
  const now = new Date('2026-07-13T12:00:00Z');
  const daysAgo = (n: number) =>
    new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

  it('stamps SUSPENDED red before anything else', () => {
    expect(
      memberStamp(
        { status: 'suspended', createdAt: daysAgo(1), ownedLibraries: 3 },
        now
      )
    ).toEqual({ label: 'SUSPENDED', tone: 'red' });
  });
  it('stamps NEW mustard for members within 7 days, even owners', () => {
    expect(
      memberStamp(
        { status: 'active', createdAt: daysAgo(6), ownedLibraries: 1 },
        now
      )
    ).toEqual({ label: 'NEW', tone: 'mustard' });
    expect(
      memberStamp(
        { status: 'active', createdAt: daysAgo(7), ownedLibraries: 0 },
        now
      )
    ).toEqual({ label: 'NEW', tone: 'mustard' });
  });
  it('stamps OWNER ink for library owners past the new window', () => {
    expect(
      memberStamp(
        { status: 'active', createdAt: daysAgo(30), ownedLibraries: 2 },
        now
      )
    ).toEqual({ label: 'OWNER', tone: 'ink' });
  });
  it('stays quiet for a plain settled member', () => {
    expect(
      memberStamp(
        { status: 'active', createdAt: daysAgo(30), ownedLibraries: 0 },
        now
      )
    ).toBeNull();
    expect(
      memberStamp(
        { status: 'inactive', createdAt: daysAgo(30), ownedLibraries: 0 },
        now
      )
    ).toBeNull();
  });
});

describe('borrowStatusStamp', () => {
  it('stamps the lifecycle: REQUESTED, RETURNED, DECLINED', () => {
    expect(borrowStatusStamp('PENDING')).toEqual({
      label: 'REQUESTED',
      tone: 'ink',
    });
    expect(borrowStatusStamp('RETURNED')).toEqual({
      label: 'RETURNED',
      tone: 'green',
    });
    expect(borrowStatusStamp('DECLINED')).toEqual({
      label: 'DECLINED',
      tone: 'red',
    });
  });

  it('reads every out-of-the-building status as OUT — same truth as the board', () => {
    for (const status of ['ACTIVE', 'APPROVED', 'RETURN_PENDING']) {
      expect(borrowStatusStamp(status)).toEqual({ label: 'OUT', tone: 'ink' });
    }
  });

  it('leaves CANCELLED (and strangers) as quiet text — no stamp ink', () => {
    expect(borrowStatusStamp('CANCELLED')).toEqual({
      label: 'CANCELLED',
      tone: null,
    });
    expect(borrowStatusStamp('SOMETHING_ELSE')).toEqual({
      label: 'SOMETHING_ELSE',
      tone: null,
    });
  });
});

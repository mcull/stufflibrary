import { describe, expect, it } from 'vitest';

import {
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

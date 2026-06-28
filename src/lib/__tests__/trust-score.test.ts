import { describe, it, expect, vi } from 'vitest';

const mockBorrowFindMany = vi.hoisted(() => vi.fn());
const mockDisputeCount = vi.hoisted(() => vi.fn());
const mockReportCount = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({
  db: {
    borrowRequest: { findMany: mockBorrowFindMany },
    dispute: { count: mockDisputeCount },
    userReport: { count: mockReportCount },
    user: { findUnique: mockUserFindUnique, update: mockUserUpdate },
  },
}));

import {
  computeTrustScore,
  recomputeUserTrustScore,
  tierForScore,
  type TrustFacts,
} from '../trust-score';

const base: TrustFacts = {
  completedBorrows: 0,
  onTimeReturns: 0,
  lateReturns: 0,
  damagedReturns: 0,
  openDisputes: 0,
  reportsAgainst: 0,
  profileComplete: false,
  emailVerified: false,
  addressVerified: false,
  accountAgeDays: 0,
};

describe('computeTrustScore', () => {
  it('a brand-new bare account scores low-moderate (standing baseline)', () => {
    const s = computeTrustScore(base);
    expect(s).toBeGreaterThanOrEqual(25);
    expect(s).toBeLessThanOrEqual(45);
  });

  it('a complete verified new profile scores higher but not maxed', () => {
    const s = computeTrustScore({
      ...base,
      profileComplete: true,
      emailVerified: true,
      addressVerified: true,
      accountAgeDays: 60,
    });
    expect(s).toBeGreaterThanOrEqual(60);
    expect(s).toBeLessThanOrEqual(80);
  });

  it('an experienced all-on-time borrower scores high', () => {
    const s = computeTrustScore({
      ...base,
      completedBorrows: 10,
      onTimeReturns: 10,
      profileComplete: true,
      emailVerified: true,
      addressVerified: true,
      accountAgeDays: 365,
    });
    expect(s).toBeGreaterThanOrEqual(85);
  });

  it('damage, lateness, disputes, and reports each lower the score', () => {
    const good = {
      ...base,
      completedBorrows: 10,
      onTimeReturns: 10,
      profileComplete: true,
      emailVerified: true,
      addressVerified: true,
      accountAgeDays: 365,
    };
    const g = computeTrustScore(good);
    expect(
      computeTrustScore({ ...good, onTimeReturns: 8, lateReturns: 2 })
    ).toBeLessThan(g);
    expect(computeTrustScore({ ...good, damagedReturns: 2 })).toBeLessThan(g);
    expect(computeTrustScore({ ...good, openDisputes: 1 })).toBeLessThan(g);
    expect(computeTrustScore({ ...good, reportsAgainst: 1 })).toBeLessThan(g);
  });

  it('clamps to 0..100', () => {
    const terrible = {
      ...base,
      completedBorrows: 10,
      onTimeReturns: 0,
      lateReturns: 10,
      damagedReturns: 10,
      openDisputes: 5,
      reportsAgainst: 5,
    };
    const s = computeTrustScore(terrible);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
});

describe('tierForScore', () => {
  it('0 completed borrows is NEW regardless of score', () => {
    expect(tierForScore(95, 0)).toBe('NEW');
  });
  it('maps score bands once there is history', () => {
    expect(tierForScore(50, 3)).toBe('BUILDING');
    expect(tierForScore(70, 3)).toBe('TRUSTED');
    expect(tierForScore(90, 3)).toBe('HIGHLY_TRUSTED');
  });
});

describe('recomputeUserTrustScore', () => {
  it('gathers facts and writes trustScore + trustTier', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      profileCompleted: true,
      emailVerified: new Date(),
      createdAt: new Date(Date.now() - 365 * 86400000),
      addresses: [{ verifiedAt: new Date() }],
    });
    mockBorrowFindMany.mockResolvedValue([
      { status: 'RETURNED', returnedLate: false, returnCondition: 'OK' },
      { status: 'RETURNED', returnedLate: false, returnCondition: 'OK' },
      { status: 'RETURNED', returnedLate: true, returnCondition: 'OK' },
      { status: 'ACTIVE', returnedLate: null, returnCondition: null },
    ]);
    mockDisputeCount.mockResolvedValue(0);
    mockReportCount.mockResolvedValue(0);
    mockUserUpdate.mockResolvedValue({});

    await recomputeUserTrustScore('u1');

    expect(mockUserUpdate).toHaveBeenCalledTimes(1);
    const data = mockUserUpdate.mock.calls[0]![0].data;
    expect(typeof data.trustScore).toBe('number');
    expect(['NEW', 'BUILDING', 'TRUSTED', 'HIGHLY_TRUSTED']).toContain(
      data.trustTier
    );
    // 3 completed borrows (2 on-time, 1 late), so not NEW
    expect(data.trustTier).not.toBe('NEW');
  });

  it('never throws if the DB errors', async () => {
    mockUserFindUnique.mockRejectedValueOnce(new Error('db down'));
    await expect(recomputeUserTrustScore('u1')).resolves.toBeUndefined();
  });
});

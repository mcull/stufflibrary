import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockCreate = vi.hoisted(() => vi.fn());
const mockFindFirst = vi.hoisted(() => vi.fn());
const mockUpsert = vi.hoisted(() => vi.fn());
const mockUpdateMany = vi.hoisted(() => vi.fn());
const mockGroupBy = vi.hoisted(() => vi.fn());
const mockEventCount = vi.hoisted(() => vi.fn());
const mockFindMany = vi.hoisted(() => vi.fn());
const mockBlockedCount = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  db: {
    securityEvent: {
      create: mockCreate,
      groupBy: mockGroupBy,
      count: mockEventCount,
      findMany: mockFindMany,
    },
    blockedIP: {
      findFirst: mockFindFirst,
      upsert: mockUpsert,
      updateMany: mockUpdateMany,
      count: mockBlockedCount,
    },
  },
}));

import {
  logSecurityEvent,
  isIPBlocked,
  blockIP,
  unblockIP,
  getSecurityMetrics,
} from '@/lib/security-logger';

describe('security-logger (DB-backed)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({});
    mockUpsert.mockResolvedValue({});
    mockUpdateMany.mockResolvedValue({ count: 1 });
  });

  describe('logSecurityEvent', () => {
    it('persists the event with mapped fields and INFO default severity', async () => {
      await logSecurityEvent({
        type: 'UNAUTHORIZED_ACCESS',
        message: 'nope',
        ipAddress: '1.2.3.4',
      });

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const data = mockCreate.mock.calls[0]![0].data;
      expect(data).toMatchObject({
        type: 'UNAUTHORIZED_ACCESS',
        severity: 'INFO',
        message: 'nope',
        ipAddress: '1.2.3.4',
        userId: null,
      });
    });

    it('never throws when the DB write fails (security logging must not break the request)', async () => {
      mockCreate.mockRejectedValueOnce(new Error('db down'));
      await expect(
        logSecurityEvent({ type: 'LOGIN_FAILED', message: 'x' })
      ).resolves.toBeUndefined();
    });
  });

  describe('isIPBlocked', () => {
    it('returns true when an active block exists', async () => {
      mockFindFirst.mockResolvedValueOnce({ id: 'b1' });
      expect(await isIPBlocked('9.9.9.9')).toBe(true);
    });

    it('returns false when no active block exists', async () => {
      mockFindFirst.mockResolvedValueOnce(null);
      expect(await isIPBlocked('9.9.9.9')).toBe(false);
    });

    it('fails open (returns false) if the lookup throws', async () => {
      mockFindFirst.mockRejectedValueOnce(new Error('db down'));
      expect(await isIPBlocked('9.9.9.9')).toBe(false);
    });
  });

  describe('blockIP', () => {
    it('upserts an active block for the IP', async () => {
      await blockIP({ ipAddress: '5.5.5.5', reason: 'API_ABUSE' });
      expect(mockUpsert).toHaveBeenCalledTimes(1);
      const args = mockUpsert.mock.calls[0]![0];
      expect(args.where).toEqual({ ipAddress: '5.5.5.5' });
      expect(args.create).toMatchObject({
        ipAddress: '5.5.5.5',
        reason: 'API_ABUSE',
        isActive: true,
      });
      expect(args.update).toMatchObject({ isActive: true });
    });

    it('propagates errors so the admin route can report failure', async () => {
      mockUpsert.mockRejectedValueOnce(new Error('db down'));
      await expect(
        blockIP({ ipAddress: '5.5.5.5', reason: 'SPAM' })
      ).rejects.toThrow();
    });
  });

  describe('unblockIP', () => {
    it('deactivates the block for the IP', async () => {
      await unblockIP('5.5.5.5', 'admin_id');
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { ipAddress: '5.5.5.5' },
        data: { isActive: false },
      });
    });
  });

  describe('getSecurityMetrics', () => {
    it('aggregates real counts into the dashboard shape', async () => {
      mockGroupBy
        .mockResolvedValueOnce([{ type: 'LOGIN_FAILED', _count: { type: 3 } }])
        .mockResolvedValueOnce([{ severity: 'INFO', _count: { severity: 5 } }]);
      mockBlockedCount.mockResolvedValueOnce(2);
      mockFindMany.mockResolvedValueOnce([]);
      mockEventCount.mockResolvedValueOnce(8);

      const metrics = await getSecurityMetrics(new Date(0), new Date());

      expect(metrics).toEqual({
        eventsByType: [{ type: 'LOGIN_FAILED', _count: { type: 3 } }],
        eventsBySeverity: [{ severity: 'INFO', _count: { severity: 5 } }],
        blockedIPCount: 2,
        recentHighSeverityEvents: [],
        totalEvents: 8,
      });
    });
  });
});

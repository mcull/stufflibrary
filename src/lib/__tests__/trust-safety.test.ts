import { UserReportReason } from '@prisma/client';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { db } from '@/lib/db';

import { TrustSafetyService } from '../trust-safety';

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    userReport: {
      findFirst: vi.fn(),
      create: vi.fn(),
      groupBy: vi.fn(),
    },
    adminAction: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const mockDb = db as unknown as typeof db;

describe('TrustSafetyService', () => {
  let service: TrustSafetyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = TrustSafetyService.getInstance();
  });

  describe('getInstance', () => {
    it('returns singleton instance', () => {
      const instance1 = TrustSafetyService.getInstance();
      const instance2 = TrustSafetyService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('calculateTrustScore', () => {
    it('calculates trust score for user with good behavior', async () => {
      const mockUser = {
        id: 'user-1',
        trustScore: 1000,
        warningCount: 0,
        suspensionCount: 0,
        borrowRequests: [
          {
            status: 'RETURNED',
            requestedReturnDate: new Date('2023-01-10'),
            actualReturnDate: new Date('2023-01-09'),
          },
          {
            status: 'RETURNED',
            requestedReturnDate: new Date('2023-02-10'),
            actualReturnDate: new Date('2023-02-10'),
          },
        ],
        lentItems: [{ status: 'RETURNED' }, { status: 'RETURNED' }],
        reportedByUser: [],
        reportsCreated: [{ id: 'report-1' }, { id: 'report-2' }],
      };

      mockDb.user.findUnique.mockResolvedValueOnce(mockUser);

      const score = await service.calculateTrustScore('user-1');
      expect(score).toBeGreaterThan(1000);
    });

    it('calculates trust score for user with poor behavior', async () => {
      const mockUser = {
        id: 'user-1',
        trustScore: 1000,
        warningCount: 3,
        suspensionCount: 1,
        borrowRequests: [
          {
            status: 'RETURNED',
            requestedReturnDate: new Date('2023-01-10'),
            actualReturnDate: new Date('2023-01-15'), // Late return
          },
        ],
        lentItems: [],
        reportedByUser: [
          { id: 'report-1' },
          { id: 'report-2' },
          { id: 'report-3' },
        ],
        reportsCreated: [],
      };

      mockDb.user.findUnique.mockResolvedValueOnce(mockUser);

      const score = await service.calculateTrustScore('user-1');
      expect(score).toBeLessThan(1000);
    });

    it('returns 0 for non-existent user', async () => {
      mockDb.user.findUnique.mockResolvedValueOnce(null);

      const score = await service.calculateTrustScore('non-existent');
      expect(score).toBe(0);
    });

    it('ensures score stays within bounds', async () => {
      const mockUser = {
        id: 'user-1',
        trustScore: 1000,
        warningCount: 20,
        suspensionCount: 10,
        borrowRequests: [],
        lentItems: [],
        reportedByUser: Array(50).fill({ id: 'report' }),
        reportsCreated: [],
      };

      mockDb.user.findUnique.mockResolvedValueOnce(mockUser);

      const score = await service.calculateTrustScore('user-1');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(2000);
    });
  });

  describe('updateUserTrustScore', () => {
    it('updates user trust score in database', async () => {
      const mockUser = {
        id: 'user-1',
        borrowRequests: [],
        lentItems: [],
        reportedByUser: [],
        reportsCreated: [],
        warningCount: 0,
        suspensionCount: 0,
      };

      mockDb.user.findUnique.mockResolvedValueOnce(mockUser);
      mockDb.user.update.mockResolvedValueOnce({ trustScore: 1000 });

      const score = await service.updateUserTrustScore('user-1');

      expect(mockDb.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { trustScore: 1000 },
      });
      expect(score).toBe(1000);
    });
  });

  describe('runAutomatedFlagging', () => {
    it('runs all active flagging rules', async () => {
      // Mock system admin
      mockDb.user.findFirst.mockResolvedValueOnce({
        id: 'system-admin',
        email: 'system@stufflibrary.com',
      });

      // Mock empty results for all rules
      mockDb.user.findMany.mockResolvedValue([]);
      mockDb.userReport.groupBy.mockResolvedValue([]);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await service.runAutomatedFlagging();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Running automated flagging checks...'
      );
      consoleSpy.mockRestore();
    });

    it('creates reports for flagged users', async () => {
      const flaggedUsers = [
        {
          id: 'user-1',
          borrowRequests: [
            { status: 'ACTIVE', requestedReturnDate: new Date('2023-01-01') },
            { status: 'ACTIVE', requestedReturnDate: new Date('2023-01-01') },
            { status: 'ACTIVE', requestedReturnDate: new Date('2023-01-01') },
          ],
        },
      ];

      mockDb.user.findMany.mockResolvedValueOnce(flaggedUsers);
      mockDb.user.findFirst.mockResolvedValueOnce({
        id: 'system-admin',
        email: 'system@stufflibrary.com',
      });
      mockDb.userReport.findFirst.mockResolvedValueOnce(null); // No existing report
      mockDb.userReport.create.mockResolvedValueOnce({ id: 'report-1' });

      await service.runAutomatedFlagging();

      expect(mockDb.userReport.create).toHaveBeenCalledWith({
        data: {
          reporterId: 'system-admin',
          reportedId: 'user-1',
          reason: UserReportReason.SAFETY_CONCERN,
          description: expect.stringContaining('Automated flagging:'),
          priority: expect.any(String),
          status: 'PENDING',
          evidence: expect.objectContaining({
            automatedRule: expect.any(String),
            flaggedAt: expect.any(String),
          }),
        },
      });
    });
  });

  describe('autoSuspendLowTrustUsers', () => {
    it('suspends users with very low trust scores', async () => {
      const lowTrustUsers = [
        {
          id: 'user-1',
          trustScore: 250,
          isSuspended: false,
        },
      ];

      mockDb.user.findMany.mockResolvedValueOnce(lowTrustUsers);
      mockDb.user.findFirst.mockResolvedValueOnce({
        id: 'system-admin',
        email: 'system@stufflibrary.com',
      });

      const mockTransaction = vi.fn().mockResolvedValueOnce(true);
      mockDb.$transaction.mockImplementation(mockTransaction);

      await service.autoSuspendLowTrustUsers();

      expect(mockDb.$transaction).toHaveBeenCalledWith([
        expect.objectContaining({
          // This would be the user update operation
        }),
        expect.objectContaining({
          // This would be the admin action creation
        }),
      ]);
    });
  });

  describe('getRules', () => {
    it('returns all flagging rules', () => {
      const rules = service.getRules();
      expect(rules).toHaveLength(4);
      expect(rules[0]?.name).toBe('Multiple Failed Returns');
      expect(rules[1]?.name).toBe('Suspicious Activity Pattern');
      expect(rules[2]?.name).toBe('Trust Score Threshold');
      expect(rules[3]?.name).toBe('Multiple Reports');
    });
  });

  describe('toggleRule', () => {
    it('toggles rule active status', () => {
      const rules = service.getRules();
      const initialStatus = rules[0]?.isActive || false;

      if (rules[0]) {
        service.toggleRule(rules[0].id, !initialStatus);

        const updatedRules = service.getRules();
        expect(updatedRules[0]?.isActive).toBe(!initialStatus);
      }
    });

    it('handles non-existent rule gracefully', () => {
      expect(() => {
        service.toggleRule('non-existent', false);
      }).not.toThrow();
    });
  });
});

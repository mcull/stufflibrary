import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { GET } from '../route';

// Mock dependencies
vi.mock('@/lib/admin-auth', () => ({
  requireAdminAuth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: { count: vi.fn() },
    collection: { count: vi.fn() },
    item: { count: vi.fn() },
    borrowRequest: { count: vi.fn() },
    invitation: { count: vi.fn() },
    userReport: { count: vi.fn() },
    dispute: { count: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

const mockRequireAdminAuth = vi.mocked(
  (await import('@/lib/admin-auth')).requireAdminAuth
);
const mockDb = vi.mocked((await import('@/lib/db')).db);

function primeHappyPath() {
  mockRequireAdminAuth.mockResolvedValueOnce({
    user: { githubUsername: 'mcull' },
  } as never);

  // Query order matches the Promise.all in the route.
  (mockDb.user.count as ReturnType<typeof vi.fn>)
    .mockResolvedValueOnce(100) // members
    .mockResolvedValueOnce(12); // membersWeekDelta
  (mockDb.collection.count as ReturnType<typeof vi.fn>)
    .mockResolvedValueOnce(8) // activeLibraries
    .mockResolvedValueOnce(2) // librariesMonthDelta
    .mockResolvedValueOnce(1); // newLibraries7d
  (mockDb.item.count as ReturnType<typeof vi.fn>)
    .mockResolvedValueOnce(40) // itemsOnShelves
    .mockResolvedValueOnce(30); // items with watercolor → 75%
  (mockDb.borrowRequest.count as ReturnType<typeof vi.fn>)
    .mockResolvedValueOnce(5) // borrowsInFlight
    .mockResolvedValueOnce(3); // overdueBorrows
  (mockDb.invitation.count as ReturnType<typeof vi.fn>)
    .mockResolvedValueOnce(20) // invitesSent30d
    .mockResolvedValueOnce(9) // invitesAccepted30d
    .mockResolvedValueOnce(6); // invitesPending
  (mockDb.userReport.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
    4
  ); // openReports
  (mockDb.dispute.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(2); // activeDisputes
  (mockDb.$queryRaw as ReturnType<typeof vi.fn>)
    // growth: one signup bucket dated today (bigint count, as Postgres returns)
    .mockResolvedValueOnce([{ d: new Date(), c: BigInt(7) }])
    // paint: month spend (SUM over all AI_RENDER rows) + successful-render count
    .mockResolvedValueOnce([{ month_cents: 123, renders: 3 }]);
}

describe('/api/admin/desk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('GET', () => {
    it('maps every count to the right response field', async () => {
      primeHappyPath();

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.kpis).toEqual({
        members: 100,
        membersWeekDelta: 12,
        activeLibraries: 8,
        librariesMonthDelta: 2,
        itemsOnShelves: 40,
        watercolorPct: 75,
        borrowsInFlight: 5,
        overdueBorrows: 3,
        invitesSent30d: 20,
        invitesAccepted30d: 9,
      });
      expect(data.onDesk).toEqual({
        openReports: 4,
        activeDisputes: 2,
        overdueBorrows: 3,
      });
      expect(data.growth.daily).toHaveLength(30);
      expect(data.growth.signupsToday).toBe(7);
      expect(data.growth.daily[29]).toBe(7);
      expect(data.growth.invitesPending).toBe(6);
      expect(data.growth.newLibraries7d).toBe(1);
      expect(data.paint).toEqual({
        monthCents: 123,
        capCents: 1000, // env fallback
        renders: 3,
      });
    });

    it('reads the paint cap from DAILY_SPEND_CAP_CENTS', async () => {
      vi.stubEnv('DAILY_SPEND_CAP_CENTS', '2500');
      primeHappyPath();

      const response = await GET();
      const data = await response.json();

      expect(data.paint.capCents).toBe(2500);
    });

    it('requires admin authentication', async () => {
      mockRequireAdminAuth.mockRejectedValueOnce(
        new Error('Admin access denied')
      );

      const response = await GET();

      expect(response.status).toBe(401);
      expect(mockRequireAdminAuth).toHaveBeenCalled();
    });
  });
});

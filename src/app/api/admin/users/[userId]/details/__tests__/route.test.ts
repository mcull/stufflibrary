import { describe, it, expect, vi, beforeEach } from 'vitest';

import { GET } from '../route';

// The regression that matters: this endpoint used to COMPUTE its own trust
// formula (profile/phone/items/activity quarters) and ship it as
// metrics.trustScore, contradicting the persisted 1B trust system shown on
// the roster one click away. The record must serve the persisted score.

vi.mock('@/lib/admin-auth', () => ({
  requireAdminAuth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: vi.fn() },
  },
}));

const mockRequireAdminAuth = vi.mocked(
  (await import('@/lib/admin-auth')).requireAdminAuth
);
const mockDb = vi.mocked((await import('@/lib/db')).db);

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const borrow = (status: string, createdDaysAgo: number, id: string) => ({
  id,
  status,
  requestMessage: null,
  lenderMessage: null,
  createdAt: daysAgo(createdDaysAgo),
  updatedAt: daysAgo(createdDaysAgo),
  item: {
    id: `item-${id}`,
    name: 'Circular saw',
    owner: { id: 'o1', name: 'Ruth C.', email: 'ruth@example.com' },
  },
});

const dbUser = (over: Record<string, unknown> = {}) => ({
  id: 'u1',
  name: 'Jenny L.',
  email: 'jenny@example.com',
  status: 'active',
  trustScore: 50,
  trustTier: 'TRUSTED',
  profileCompleted: false,
  phoneVerified: false,
  createdAt: new Date('2026-03-15T12:00:00Z'),
  _count: { items: 3, borrowRequests: 4, addresses: 1, ownedCollections: 1 },
  addresses: [],
  borrowRequests: [
    borrow('APPROVED', 2, 'b1'),
    borrow('APPROVED', 10, 'b2'),
    borrow('DECLINED', 40, 'b3'),
    borrow('PENDING', 1, 'b4'),
  ],
  items: [],
  ...over,
});

function prime(user: unknown) {
  mockRequireAdminAuth.mockResolvedValueOnce({
    user: { githubUsername: 'mcull' },
  } as never);
  (mockDb.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
    user
  );
}

const get = () =>
  GET(new Request('http://localhost:3000/api/admin/users/u1/details'), {
    params: Promise.resolve({ userId: 'u1' }),
  });

describe('/api/admin/users/[userId]/details', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes the PERSISTED trustScore and trustTier through untouched', async () => {
    // profileCompleted false + phoneVerified false would have read as a much
    // lower number under the deleted legacy formula — 50 must survive.
    prime(dbUser());

    const response = await get();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.trustScore).toBe(50);
    expect(data.user.trustTier).toBe('TRUSTED');
  });

  it('serves no computed-score fields — the legacy formula is gone', async () => {
    prime(dbUser());

    const data = await (await get()).json();

    expect(data.user.metrics.trustScore).toBeUndefined();
    expect(data.user.metrics.activityLevel).toBeUndefined();
    expect(data.user.metrics.profileScore).toBeUndefined();
  });

  it('keeps the honest aggregates: counts by status, approval rate, 30-day activity', async () => {
    prime(dbUser());

    const data = await (await get()).json();

    expect(data.user.metrics.totalBorrowRequests).toBe(4);
    expect(data.user.metrics.approvedRequests).toBe(2);
    expect(data.user.metrics.rejectedRequests).toBe(1);
    expect(data.user.metrics.pendingRequests).toBe(1);
    expect(data.user.metrics.approvalRate).toBe(50);
    expect(data.user.metrics.recentActivity).toBe(3); // b1, b2, b4 within 30d
  });

  it('asks Prisma for the owned-library count (the OWNER stamp needs it)', async () => {
    prime(dbUser());

    await get();

    const include = (mockDb.user.findUnique as ReturnType<typeof vi.fn>).mock
      .calls[0]![0].include;
    expect(include._count.select.ownedCollections).toBe(true);
  });

  it('404s when the member is not on file', async () => {
    prime(null);

    const response = await get();

    expect(response.status).toBe(404);
  });
});

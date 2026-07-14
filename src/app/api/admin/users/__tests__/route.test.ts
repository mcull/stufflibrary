import { describe, it, expect, vi, beforeEach } from 'vitest';

import { GET } from '../route';

// Focused on the Members-roster additions: ownersOnly filter, owned-library
// counts, and the first-membership home library. (The route predates this
// suite; legacy behavior is covered only where the new pieces touch it.)

vi.mock('@/lib/admin-auth', () => ({
  requireAdminAuth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: { findMany: vi.fn(), count: vi.fn() },
  },
}));

const mockRequireAdminAuth = vi.mocked(
  (await import('@/lib/admin-auth')).requireAdminAuth
);
const mockDb = vi.mocked((await import('@/lib/db')).db);

const dbUser = (over: Record<string, unknown> = {}) => ({
  id: 'u1',
  name: 'Jenny L.',
  email: 'jenny@example.com',
  status: 'active',
  profileCompleted: true,
  phone: null,
  phoneVerified: false,
  bio: null,
  shareInterests: [],
  borrowInterests: [],
  movedInDate: null,
  trustScore: 91,
  trustTier: null,
  createdAt: new Date('2026-03-15T12:00:00Z'),
  updatedAt: new Date('2026-07-01T12:00:00Z'),
  _count: {
    items: 14,
    borrowRequests: 52,
    addresses: 1,
    ownedCollections: 2,
  },
  collectionMemberships: [{ collection: { name: 'Maple St Library' } }],
  borrowRequests: [],
  items: [],
  ...over,
});

function prime(users: unknown[], total = users.length) {
  mockRequireAdminAuth.mockResolvedValueOnce({
    user: { githubUsername: 'mcull' },
  } as never);
  (mockDb.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
    users
  );
  (mockDb.user.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(total);
}

describe('/api/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carries owned-library counts and the first-membership home library', async () => {
    prime([dbUser(), dbUser({ id: 'u2', collectionMemberships: [] })]);

    const response = await GET(
      new Request('http://localhost:3000/api/admin/users')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.users[0]._count.ownedCollections).toBe(2);
    expect(data.users[0].collectionMemberships[0].collection.name).toBe(
      'Maple St Library'
    );
    expect(data.users[1].collectionMemberships).toEqual([]);

    // The select actually asks Prisma for the new facts
    const select = (mockDb.user.findMany as ReturnType<typeof vi.fn>).mock
      .calls[0]![0].select;
    expect(select._count.select.ownedCollections).toBe(true);
    expect(select.collectionMemberships).toEqual({
      orderBy: { joinedAt: 'asc' },
      take: 1,
      select: { collection: { select: { name: true } } },
    });
  });

  it('ownersOnly=true filters by owning ≥1 library in both query and count', async () => {
    prime([dbUser()], 7);

    const response = await GET(
      new Request('http://localhost:3000/api/admin/users?ownersOnly=true')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    const findWhere = (mockDb.user.findMany as ReturnType<typeof vi.fn>).mock
      .calls[0]![0].where;
    const countWhere = (mockDb.user.count as ReturnType<typeof vi.fn>).mock
      .calls[0]![0].where;
    expect(findWhere.ownedCollections).toEqual({ some: {} });
    expect(countWhere.ownedCollections).toEqual({ some: {} });
    expect(data.pagination.total).toBe(7);
  });

  it('leaves the where clause alone when ownersOnly is absent or false', async () => {
    prime([dbUser()]);

    await GET(
      new Request('http://localhost:3000/api/admin/users?ownersOnly=false')
    );

    const findWhere = (mockDb.user.findMany as ReturnType<typeof vi.fn>).mock
      .calls[0]![0].where;
    expect(findWhere.ownedCollections).toBeUndefined();
  });

  it('still composes with status and joinedAfter (the roster chips)', async () => {
    prime([]);

    await GET(
      new Request(
        'http://localhost:3000/api/admin/users?status=suspended&joinedAfter=2026-07-06T00:00:00.000Z'
      )
    );

    const findWhere = (mockDb.user.findMany as ReturnType<typeof vi.fn>).mock
      .calls[0]![0].where;
    expect(findWhere.status).toBe('suspended');
    expect(findWhere.createdAt.gte).toEqual(
      new Date('2026-07-06T00:00:00.000Z')
    );
  });

  it('requires admin authentication', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRequireAdminAuth.mockRejectedValueOnce(
      new Error('Admin access denied')
    );

    const response = await GET(
      new Request('http://localhost:3000/api/admin/users')
    );

    expect(response.status).toBe(401);
    expect(mockDb.user.findMany).not.toHaveBeenCalled();
  });
});

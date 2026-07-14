import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '../route';

vi.mock('@/lib/admin-auth', () => ({
  requireAdminAuth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    collection: { findMany: vi.fn() },
    borrowRequest: { count: vi.fn() },
  },
}));

const mockRequireAdminAuth = vi.mocked(
  (await import('@/lib/admin-auth')).requireAdminAuth
);
const mockDb = vi.mocked((await import('@/lib/db')).db);

/** A library as db.collection.findMany returns it for this route's select. */
const dbLibrary = (over: Record<string, unknown> = {}) => ({
  id: 'lib1',
  name: 'Maple St Library',
  isArchived: false,
  createdAt: new Date('2026-03-15T12:00:00Z'),
  owner: {
    name: 'Jenny L.',
    addresses: [{ latitude: 50, longitude: 60 }],
  },
  members: [
    { user: { addresses: [{ latitude: 10, longitude: 20 }] } },
    { user: { addresses: [{ latitude: 30, longitude: 40 }] } },
  ],
  _count: { members: 214, items: 612 },
  ...over,
});

function primeAuth() {
  mockRequireAdminAuth.mockResolvedValueOnce({
    user: { githubUsername: 'mcull' },
  } as never);
}

describe('/api/admin/libraries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns each branch with its stats, owner, and derived centroid', async () => {
    primeAuth();
    (
      mockDb.collection.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce([dbLibrary()]);
    (
      mockDb.borrowRequest.count as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(88);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.libraries).toHaveLength(1);
    const row = data.libraries[0];
    expect(row.id).toBe('lib1');
    expect(row.name).toBe('Maple St Library');
    expect(row.ownerName).toBe('Jenny L.');
    // +1 for the owner — parity with admin/collections (214 active members + owner)
    expect(row.memberCount).toBe(215);
    expect(row.itemCount).toBe(612);
    expect(row.borrows30d).toBe(88);
    expect(row.isArchived).toBe(false);
    // Centroid = average of the two member addresses AND the owner's:
    // lat (10+30+50)/3, lng (20+40+60)/3.
    expect(row.centroid).toEqual({ lat: 30, lng: 40 });
  });

  it('scopes the borrow count to the last 30 days and this library only', async () => {
    primeAuth();
    (
      mockDb.collection.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce([dbLibrary({ id: 'libX' })]);
    (
      mockDb.borrowRequest.count as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(3);

    await GET();

    const where = (mockDb.borrowRequest.count as ReturnType<typeof vi.fn>).mock
      .calls[0]![0].where;
    expect(where.item.collections.some.collectionId).toBe('libX');
    expect(where.createdAt.gte).toBeInstanceOf(Date);
    // Only real loans count — PENDING/DECLINED/CANCELLED never left the shelf.
    expect(where.status.in).toEqual([
      'APPROVED',
      'ACTIVE',
      'RETURN_PENDING',
      'RETURNED',
    ]);
    // ~30 days back
    const ageMs = Date.now() - where.createdAt.gte.getTime();
    expect(ageMs).toBeGreaterThan(29 * 24 * 60 * 60 * 1000);
    expect(ageMs).toBeLessThan(31 * 24 * 60 * 60 * 1000);
  });

  it('falls back to the owner address when no member is located', async () => {
    primeAuth();
    (
      mockDb.collection.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce([
      dbLibrary({
        members: [
          { user: { addresses: [] } },
          { user: { addresses: [{ latitude: null, longitude: null }] } },
        ],
        owner: {
          name: 'Jenny L.',
          addresses: [{ latitude: 51, longitude: -1 }],
        },
      }),
    ]);
    (
      mockDb.borrowRequest.count as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(0);

    const res = await GET();
    const data = await res.json();
    expect(data.libraries[0].centroid).toEqual({ lat: 51, lng: -1 });
  });

  it('returns a null centroid (off map) when nothing is located', async () => {
    primeAuth();
    (
      mockDb.collection.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce([
      dbLibrary({
        members: [{ user: { addresses: [] } }],
        owner: { name: 'Nobody', addresses: [] },
      }),
    ]);
    (
      mockDb.borrowRequest.count as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(0);

    const res = await GET();
    const data = await res.json();
    expect(data.libraries[0].centroid).toBeNull();
  });

  it('orders non-archived first, then by member count desc', async () => {
    primeAuth();
    (
      mockDb.collection.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce([
      dbLibrary({
        id: 'archived',
        isArchived: true,
        _count: { members: 999, items: 5 },
      }),
      dbLibrary({ id: 'small', _count: { members: 3, items: 5 } }),
      dbLibrary({ id: 'big', _count: { members: 200, items: 5 } }),
    ]);
    (mockDb.borrowRequest.count as ReturnType<typeof vi.fn>).mockResolvedValue(
      0
    );

    const res = await GET();
    const data = await res.json();
    expect(data.libraries.map((l: { id: string }) => l.id)).toEqual([
      'big',
      'small',
      'archived',
    ]);
    expect(data.libraries[2].isArchived).toBe(true);
  });

  it('answers 401 when the caller is not an admin', async () => {
    mockRequireAdminAuth.mockRejectedValueOnce(new Error('Access denied'));

    const res = await GET();
    expect(res.status).toBe(401);
    expect(mockDb.collection.findMany).not.toHaveBeenCalled();
  });
});

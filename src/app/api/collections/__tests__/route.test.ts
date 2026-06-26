import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockInvitationFindMany = vi.hoisted(() => vi.fn());
const mockCollectionFindMany = vi.hoisted(() => vi.fn());
const mockMemberFindMany = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({
  db: {
    invitation: { findMany: mockInvitationFindMany },
    collection: { findMany: mockCollectionFindMany },
    collectionMember: { findMany: mockMemberFindMany },
  },
}));

import { GET } from '../route';

const OWNER_ID = 'owner_1';

describe('GET /api/collections (my libraries)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockResolvedValue({
      user: { id: OWNER_ID, name: 'Owner', image: null },
    });
    mockInvitationFindMany.mockResolvedValue([]); // skip the membership-sync path
  });

  it('does not list an owned library twice when the owner also has a membership row in it', async () => {
    // Owner owns lib_1.
    mockCollectionFindMany.mockResolvedValue([
      {
        id: 'lib_1',
        name: 'My Library',
        description: null,
        location: null,
        isPublic: false,
        createdAt: new Date('2026-01-01'),
        members: [],
        _count: { members: 0, items: 0 },
      },
    ]);
    // ...but also has a stray membership row in lib_1, plus a real membership in lib_2.
    mockMemberFindMany.mockResolvedValue([
      {
        role: 'member',
        joinedAt: new Date('2026-02-01'),
        collection: {
          id: 'lib_1',
          name: 'My Library',
          description: null,
          location: null,
          isPublic: false,
          owner: { id: OWNER_ID, name: 'Owner', image: null, status: 'active' },
          _count: { members: 0, items: 0 },
        },
      },
      {
        role: 'member',
        joinedAt: new Date('2026-02-02'),
        collection: {
          id: 'lib_2',
          name: 'Someone Elses Library',
          description: null,
          location: null,
          isPublic: true,
          owner: { id: 'other', name: 'Other', image: null, status: 'active' },
          _count: { members: 1, items: 0 },
        },
      },
    ]);

    const res = await GET();
    const body = await res.json();

    const ids = body.collections.map((c: { id: string }) => c.id);
    expect(ids.filter((id: string) => id === 'lib_1')).toHaveLength(1);
    expect(ids).toContain('lib_2');
    expect(body.collections).toHaveLength(2);
    // lib_1 is surfaced as owned, not as a joined membership.
    const lib1 = body.collections.find((c: { id: string }) => c.id === 'lib_1');
    expect(lib1.role).toBe('owner');
  });
});

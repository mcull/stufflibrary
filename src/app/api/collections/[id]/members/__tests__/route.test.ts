import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockMemberFindFirst = vi.hoisted(() => vi.fn());
const mockMemberFindMany = vi.hoisted(() => vi.fn());
const mockCollectionFindFirst = vi.hoisted(() => vi.fn());
const mockCollectionFindUnique = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({
  db: {
    collectionMember: {
      findFirst: mockMemberFindFirst,
      findMany: mockMemberFindMany,
    },
    collection: {
      findFirst: mockCollectionFindFirst,
      findUnique: mockCollectionFindUnique,
    },
  },
}));

import { GET } from '../route';

const COLLECTION_ID = 'lib_1';
const OWNER_ID = 'owner_1';

function activeUser(id: string, name: string) {
  return {
    id,
    name,
    email: `${id}@example.com`,
    image: null,
    status: 'active',
    addresses: [],
  };
}

function callGET() {
  return GET({} as never, {
    params: Promise.resolve({ id: COLLECTION_ID }),
  });
}

describe('GET /api/collections/[id]/members', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockResolvedValue({ user: { id: OWNER_ID } });
    // Requester is the owner.
    mockCollectionFindFirst.mockResolvedValue({ id: COLLECTION_ID });
    mockMemberFindFirst.mockResolvedValue(null);
    mockCollectionFindUnique.mockResolvedValue({
      createdAt: new Date('2026-01-01'),
      owner: activeUser(OWNER_ID, 'Owner'),
    });
  });

  it('lists the owner only once even when the owner also has a membership row', async () => {
    // The owner clicked their own join link, so they have a stray membership
    // row in addition to being collection.owner.
    mockMemberFindMany.mockResolvedValue([
      {
        id: 'm_owner',
        userId: OWNER_ID,
        role: 'member',
        joinedAt: new Date('2026-02-01'),
        user: activeUser(OWNER_ID, 'Owner'),
      },
      {
        id: 'm_bob',
        userId: 'bob',
        role: 'member',
        joinedAt: new Date('2026-02-02'),
        user: activeUser('bob', 'Bob'),
      },
    ]);

    const res = await callGET();
    const body = await res.json();

    const ownerEntries = body.members.filter(
      (m: { user: { id: string } }) => m.user.id === OWNER_ID
    );
    expect(ownerEntries).toHaveLength(1);
    expect(body.members).toHaveLength(2); // owner + bob, not 3
  });

  it('still includes the owner when they have no membership row', async () => {
    mockMemberFindMany.mockResolvedValue([
      {
        id: 'm_bob',
        userId: 'bob',
        role: 'member',
        joinedAt: new Date('2026-02-02'),
        user: activeUser('bob', 'Bob'),
      },
    ]);

    const res = await callGET();
    const body = await res.json();

    const ids = body.members.map((m: { user: { id: string } }) => m.user.id);
    expect(ids).toContain(OWNER_ID);
    expect(ids).toContain('bob');
    expect(body.members).toHaveLength(2);
  });
});

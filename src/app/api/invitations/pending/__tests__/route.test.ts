import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockInvitationFindMany = vi.hoisted(() => vi.fn());
const mockMemberFindMany = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: mockUserFindUnique },
    invitation: { findMany: mockInvitationFindMany },
    collectionMember: { findMany: mockMemberFindMany },
  },
}));

import { GET } from '../route';

const INVITATION = {
  id: 'inv_1',
  token: 'tok_abc',
  createdAt: new Date('2026-07-20'),
  expiresAt: new Date('2026-07-27'),
  collection: {
    id: 'lib_1',
    name: 'HAASS',
    location: 'Berkeley Hills',
    owner: { name: 'Marc', email: 'marc@example.com' },
    _count: { members: 3 },
  },
  sender: { name: 'Marc', email: 'marc@example.com' },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } });
  mockUserFindUnique.mockResolvedValue({ email: 'nora@example.com' });
  mockInvitationFindMany.mockResolvedValue([INVITATION]);
  mockMemberFindMany.mockResolvedValue([]);
});

describe('GET /api/invitations/pending', () => {
  it("filters on type 'library' — the type invitations are actually written with (§6.8)", async () => {
    await GET({} as never);

    expect(mockInvitationFindMany).toHaveBeenCalledTimes(1);
    const where = mockInvitationFindMany.mock.calls[0]![0].where;
    expect(where.type).toBe('library');
    expect(where.email).toBe('nora@example.com');
  });

  it('returns the pending invitation for the session email', async () => {
    const res = await GET({} as never);
    const body = await res.json();

    expect(body.invitations).toHaveLength(1);
    expect(body.invitations[0].collection.name).toBe('HAASS');
    expect(body.invitations[0].token).toBe('tok_abc');
  });
});

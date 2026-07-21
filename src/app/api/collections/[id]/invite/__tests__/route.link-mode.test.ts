import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockGetUserCapabilities = vi.hoisted(() => vi.fn());
const mockCollectionFindFirst = vi.hoisted(() => vi.fn());
const mockMemberFindFirst = vi.hoisted(() => vi.fn());
const mockInvitationFindFirst = vi.hoisted(() => vi.fn());
const mockInvitationCount = vi.hoisted(() => vi.fn());
const mockInvitationCreate = vi.hoisted(() => vi.fn());
const mockJoinCodeFindFirst = vi.hoisted(() => vi.fn());
const mockJoinCodeCreate = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/user-capabilities', () => ({
  getUserCapabilities: mockGetUserCapabilities,
}));
vi.mock('@/lib/db', () => ({
  db: {
    collection: { findFirst: mockCollectionFindFirst },
    collectionMember: { findFirst: mockMemberFindFirst },
    invitation: {
      findFirst: mockInvitationFindFirst,
      count: mockInvitationCount,
      create: mockInvitationCreate,
      update: vi.fn(),
    },
    joinCode: {
      findFirst: mockJoinCodeFindFirst,
      create: mockJoinCodeCreate,
    },
  },
}));

import { POST } from '../route';

function call(body: unknown) {
  return POST(
    new Request('http://t', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }) as never,
    { params: Promise.resolve({ id: 'lib1' }) }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXTAUTH_URL = 'https://stufflibrary.test';
  mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } });
  mockGetUserCapabilities.mockResolvedValue({ canInvite: true, reasons: {} });
  mockCollectionFindFirst.mockResolvedValue({
    id: 'lib1',
    name: 'Lib',
    location: null,
    owner: { name: 'O', email: 'o@x.z' },
    inviteRateLimitPerHour: 0,
    _count: {},
  });
  mockMemberFindFirst.mockResolvedValue({ id: 'm1' });
  mockInvitationFindFirst.mockResolvedValue(null);
  mockInvitationCount.mockResolvedValue(0);
  mockJoinCodeFindFirst.mockResolvedValue(null);
  mockJoinCodeCreate.mockImplementation(({ data }: any) => ({
    id: 'jc_new',
    ...data,
  }));
});

describe('POST /api/collections/[id]/invite — mode: link', () => {
  it('creates a JoinCode and never an Invitation', async () => {
    const res = await call({ mode: 'link' });

    expect(res.status).toBe(200);
    expect(mockJoinCodeCreate).toHaveBeenCalled();
    // The whole point of this change: a bearer share link is addressed to
    // nobody, so there is no Invitation and no fabricated addressee.
    expect(mockInvitationCreate).not.toHaveBeenCalled();
  });

  it('never fabricates a share.stufflibrary.local address anywhere', async () => {
    const res = await call({ mode: 'link' });

    // Status first: without it this assertion passes just as well on a 500,
    // which is what the old synthetic-address path degrades to here.
    expect(res.status).toBe(200);
    const serialized = JSON.stringify(await res.json());
    expect(serialized).not.toContain('share.stufflibrary.local');
    expect(JSON.stringify(mockJoinCodeCreate.mock.calls)).not.toContain(
      'share.stufflibrary.local'
    );
  });

  it('returns a /join/<code> link carrying the code, not a 64-hex token', async () => {
    const res = await call({ mode: 'link' });
    const body = await res.json();

    const created = mockJoinCodeCreate.mock.calls[0]?.[0]?.data?.code;
    expect(body.link).toBe(`https://stufflibrary.test/join/${created}`);
    expect(created).toHaveLength(8);
  });

  it('reuses the library share link instead of minting one per click', async () => {
    mockJoinCodeFindFirst.mockResolvedValue({
      id: 'jc_existing',
      code: 'XKF72M9Q',
      collectionId: 'lib1',
      isActive: true,
    });

    const res = await call({ mode: 'link' });
    const body = await res.json();

    // Every mint is another live bearer credential nobody can recall. Two
    // clicks of one button must not leave two of them behind.
    expect(mockJoinCodeCreate).not.toHaveBeenCalled();
    expect(body.link).toBe('https://stufflibrary.test/join/XKF72M9Q');
  });

  it('only ever reuses a live code for this library', async () => {
    await call({ mode: 'link' });

    expect(mockJoinCodeFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          collectionId: 'lib1',
          isActive: true,
        }),
      })
    );
  });

  it('still refuses a caller who cannot invite', async () => {
    mockGetUserCapabilities.mockResolvedValue({
      canInvite: false,
      reasons: { canInvite: 'NEEDS_PHOTO' },
    });

    const res = await call({ mode: 'link' });

    expect(res.status).toBe(403);
    expect(mockJoinCodeCreate).not.toHaveBeenCalled();
  });

  it('still refuses a caller who is not a member at all', async () => {
    mockCollectionFindFirst.mockResolvedValue(null);
    mockMemberFindFirst.mockResolvedValue(null);

    const res = await call({ mode: 'link' });

    expect(res.status).toBe(403);
    expect(mockJoinCodeCreate).not.toHaveBeenCalled();
  });
});

import { it, expect, beforeEach, vi } from 'vitest';

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

function call(body: unknown) {
  return import('../route').then(({ POST }) =>
    POST(
      new Request('http://t', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }) as any,
      { params: Promise.resolve({ id: 'lib1' }) }
    )
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } });
  mockCollectionFindFirst.mockResolvedValue(null); // not owner/admin
});

it('rejects a non-owner BUILDING member (403 NEEDS_TRUST_TIER)', async () => {
  mockMemberFindFirst.mockResolvedValue({ id: 'm1' });
  mockGetUserCapabilities.mockResolvedValue({
    canInvite: false,
    reasons: { canInvite: 'NEEDS_TRUST_TIER' },
  });
  const res = await call({ email: 'x@y.z', mode: 'email' });
  expect(res.status).toBe(403);
  expect((await res.json()).reason).toBe('NEEDS_TRUST_TIER');
});

it('rejects an owner with only a minimal profile (403 NEEDS_PHOTO)', async () => {
  // Owner/admin lookup succeeds, but inviting now requires a full profile.
  mockCollectionFindFirst.mockResolvedValue({
    id: 'lib1',
    name: 'Lib',
    owner: { name: 'O', email: 'o@x.z' },
    _count: {},
  });
  mockGetUserCapabilities.mockResolvedValue({
    canInvite: false,
    reasons: { canInvite: 'NEEDS_PHOTO' },
  });
  const res = await call({ email: 'x@y.z', mode: 'email' });
  expect(res.status).toBe(403);
  expect((await res.json()).reason).toBe('NEEDS_PHOTO');
});

it('rejects a non-member entirely (403)', async () => {
  mockMemberFindFirst.mockResolvedValue(null);
  const res = await call({ email: 'x@y.z', mode: 'email' });
  expect(res.status).toBe(403);
});

it('lets a permitted member send an invite (re-loads library, 200)', async () => {
  mockMemberFindFirst.mockResolvedValue({ id: 'm1' }); // active member
  mockGetUserCapabilities.mockResolvedValue({ canInvite: true, reasons: {} });
  mockCollectionFindFirst
    .mockResolvedValueOnce(null) // owner/admin lookup misses
    .mockResolvedValueOnce({
      // re-load for the email payload
      id: 'lib1',
      name: 'Lib',
      location: null,
      owner: { name: 'O', email: 'o@x.z' },
      inviteRateLimitPerHour: 0,
      _count: {},
    });
  mockInvitationFindFirst.mockResolvedValue(null);
  mockInvitationCount.mockResolvedValue(0);
  // Share Link is a JoinCode now, not an Invitation with a fabricated
  // addressee — see route.link-mode.test.ts for the behaviour itself.
  mockJoinCodeFindFirst.mockResolvedValue(null);
  mockJoinCodeCreate.mockResolvedValue({ id: 'jc1', code: 'XKF72M9Q' });
  const res = await call({ mode: 'link' });
  expect(res.status).toBe(200);
  expect(mockInvitationCreate).not.toHaveBeenCalled();
});

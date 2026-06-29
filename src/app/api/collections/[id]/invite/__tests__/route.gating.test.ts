import { it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockGetUserCapabilities = vi.hoisted(() => vi.fn());
const mockCollectionFindFirst = vi.hoisted(() => vi.fn());
const mockMemberFindFirst = vi.hoisted(() => vi.fn());
const mockInvitationFindFirst = vi.hoisted(() => vi.fn());
const mockInvitationCount = vi.hoisted(() => vi.fn());
const mockInvitationCreate = vi.hoisted(() => vi.fn());

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

it('rejects a non-member entirely (403)', async () => {
  mockMemberFindFirst.mockResolvedValue(null);
  const res = await call({ email: 'x@y.z', mode: 'email' });
  expect(res.status).toBe(403);
});

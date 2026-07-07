import { it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockGetUserCapabilities = vi.hoisted(() => vi.fn());
const mockCollectionFindFirst = vi.hoisted(() => vi.fn());
const mockMemberFindFirst = vi.hoisted(() => vi.fn());
const mockInvitationFindFirst = vi.hoisted(() => vi.fn());
const mockInvitationCount = vi.hoisted(() => vi.fn());
const mockInvitationCreate = vi.hoisted(() => vi.fn());
const mockInvitationUpdate = vi.hoisted(() => vi.fn());
const mockEmailSend = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/user-capabilities', () => ({
  getUserCapabilities: mockGetUserCapabilities,
}));
vi.mock('resend', () => ({
  Resend: vi.fn(() => ({ emails: { send: mockEmailSend } })),
}));
vi.mock('@/lib/db', () => ({
  db: {
    collection: { findFirst: mockCollectionFindFirst },
    collectionMember: { findFirst: mockMemberFindFirst },
    invitation: {
      findFirst: mockInvitationFindFirst,
      count: mockInvitationCount,
      create: mockInvitationCreate,
      update: mockInvitationUpdate,
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

const OWNER_LIBRARY = {
  id: 'lib1',
  name: 'Lib',
  location: null,
  owner: { name: 'O', email: 'o@x.z' },
  inviteRateLimitPerHour: 0,
  _count: {},
};

const INVITE_ROW = (over: Record<string, unknown>) => ({
  id: 'inv1',
  email: 'n@x.z',
  token: 'old-token',
  expiresAt: new Date(Date.now() + 86400000),
  collection: { name: 'Lib', location: null },
  sender: { name: 'O' },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } });
  mockCollectionFindFirst.mockResolvedValue(OWNER_LIBRARY);
  mockGetUserCapabilities.mockResolvedValue({ canInvite: true, reasons: {} });
  mockMemberFindFirst.mockResolvedValue(null); // invitee is not a member
  mockInvitationCount.mockResolvedValue(0);
  mockEmailSend.mockResolvedValue({ id: 'email1' });
  mockInvitationUpdate.mockResolvedValue(INVITE_ROW({}));
});

it('re-issues a consumed invitation instead of 500ing on the unique constraint (#409)', async () => {
  mockInvitationFindFirst.mockResolvedValue(
    INVITE_ROW({ status: 'ACCEPTED', acceptedAt: new Date() })
  );
  const res = await call({ email: 'n@x.z', mode: 'email' });
  expect(res.status).toBe(200);
  expect(mockInvitationCreate).not.toHaveBeenCalled();
  // First update = the re-issue: fresh token, back to PENDING, acceptance cleared.
  const reissue = mockInvitationUpdate.mock.calls[0]![0];
  expect(reissue.where).toEqual({ id: 'inv1' });
  expect(reissue.data.status).toBe('PENDING');
  expect(reissue.data.token).toBeDefined();
  expect(reissue.data.token).not.toBe('old-token');
  expect(reissue.data.acceptedAt).toBeNull();
  expect(reissue.data.receiverId).toBeNull();
  expect(mockEmailSend).toHaveBeenCalled();
});

it('re-sends a still-live invitation with the SAME token (old email link keeps working)', async () => {
  mockInvitationFindFirst.mockResolvedValue(INVITE_ROW({ status: 'SENT' }));
  const res = await call({ email: 'n@x.z', mode: 'email' });
  expect(res.status).toBe(200);
  expect(mockInvitationCreate).not.toHaveBeenCalled();
  expect(mockEmailSend).toHaveBeenCalled();
  const json = await res.json();
  expect(json.link).toContain('old-token');
});

it('re-issues an expired invitation with a fresh token and expiry', async () => {
  mockInvitationFindFirst.mockResolvedValue(
    INVITE_ROW({ status: 'SENT', expiresAt: new Date(Date.now() - 1000) })
  );
  const res = await call({ email: 'n@x.z', mode: 'email' });
  expect(res.status).toBe(200);
  const reissue = mockInvitationUpdate.mock.calls[0]![0];
  expect(reissue.data.token).not.toBe('old-token');
  expect(reissue.data.expiresAt.getTime()).toBeGreaterThan(Date.now());
});

it('still rejects when the invitee is already an active member', async () => {
  mockMemberFindFirst.mockResolvedValue({ id: 'm1', isActive: true });
  const res = await call({ email: 'n@x.z', mode: 'email' });
  expect(res.status).toBe(400);
});

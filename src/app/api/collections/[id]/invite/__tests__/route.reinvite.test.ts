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
    // #412: the email body pulls up to 3 item watercolors from the library.
    item: { findMany: vi.fn().mockResolvedValue([]) },
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
  shortCode: 'OLDCODE1',
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
  const reissue = mockInvitationUpdate.mock.calls[0]![0];
  expect(reissue.data.token).toBeUndefined();
});

// The short code is the thing actually printed in the email, so the reuse rule
// that protects `token` has to protect it too. Minting a fresh code for a live
// invitation silently kills the link already sitting in someone's inbox.
it('re-sends a still-live invitation with the SAME short code', async () => {
  mockInvitationFindFirst.mockResolvedValue(INVITE_ROW({ status: 'SENT' }));
  const res = await call({ email: 'n@x.z', mode: 'email' });
  const json = await res.json();
  expect(json.link).toContain('/join/OLDCODE1');
  const reissue = mockInvitationUpdate.mock.calls[0]![0];
  expect(reissue.data.shortCode).toBe('OLDCODE1');
});

it('re-issues a consumed invitation with a fresh short code as well as a fresh token', async () => {
  mockInvitationFindFirst.mockResolvedValue(
    INVITE_ROW({ status: 'ACCEPTED', acceptedAt: new Date() })
  );
  const res = await call({ email: 'n@x.z', mode: 'email' });
  const reissue = mockInvitationUpdate.mock.calls[0]![0];
  expect(reissue.data.shortCode).toBeDefined();
  expect(reissue.data.shortCode).not.toBe('OLDCODE1');
  expect(reissue.data.shortCode).toHaveLength(8);
  const json = await res.json();
  expect(json.link).toContain(`/join/${reissue.data.shortCode}`);
});

// Rows predating the short-code column are live but have no code to keep.
it('mints a short code for a live invitation that never had one', async () => {
  mockInvitationFindFirst.mockResolvedValue(
    INVITE_ROW({ status: 'SENT', shortCode: null })
  );
  const res = await call({ email: 'n@x.z', mode: 'email' });
  const reissue = mockInvitationUpdate.mock.calls[0]![0];
  expect(reissue.data.shortCode).toHaveLength(8);
  // Still live, so the token is untouched even though the code is new.
  expect(reissue.data.token).toBeUndefined();
  const json = await res.json();
  expect(json.link).toContain(`/join/${reissue.data.shortCode}`);
});

it('mints a short code on a brand-new invitation and shares the /join link', async () => {
  mockInvitationFindFirst.mockResolvedValue(null);
  mockInvitationCreate.mockResolvedValue(INVITE_ROW({}));
  const res = await call({ email: 'n@x.z', mode: 'email' });
  const created = mockInvitationCreate.mock.calls[0]![0];
  expect(created.data.shortCode).toHaveLength(8);
  const json = await res.json();
  expect(json.link).toContain(`/join/${created.data.shortCode}`);
  // The 64-hex token must never be what we print.
  expect(json.link).not.toContain(created.data.token);
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

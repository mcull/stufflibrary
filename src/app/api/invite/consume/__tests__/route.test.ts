import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockCollectionFindUnique = vi.hoisted(() => vi.fn());
const mockMemberFindUnique = vi.hoisted(() => vi.fn());
const mockMemberCreate = vi.hoisted(() => vi.fn());
const mockMemberUpdate = vi.hoisted(() => vi.fn());
const mockMemberUpdateMany = vi.hoisted(() => vi.fn());
const mockInvitationFindFirst = vi.hoisted(() => vi.fn());
const mockInvitationUpdateMany = vi.hoisted(() => vi.fn());
const mockRecordJoinCodeUse = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({
  db: {
    collection: { findUnique: mockCollectionFindUnique },
    collectionMember: {
      findUnique: mockMemberFindUnique,
      create: mockMemberCreate,
      update: mockMemberUpdate,
      updateMany: mockMemberUpdateMany,
    },
    invitation: {
      findFirst: mockInvitationFindFirst,
      updateMany: mockInvitationUpdateMany,
    },
  },
}));
vi.mock('@/lib/join-code-service', () => ({
  resolveJoinCode: vi.fn(),
  recordJoinCodeUse: mockRecordJoinCodeUse,
}));

import { POST } from '../route';

const LIB = 'lib_1';
const CODE_ID = 'jcode_1';

/**
 * Cookies are set on the instance, not passed as a `cookie` request header.
 * `cookie` is a forbidden header name, and the fetch implementation behind
 * NextRequest silently drops it — a request built that way arrives at the
 * route with no cookies at all, and every assertion about cookie handling
 * passes for the wrong reason.
 */
function post(cookies: Record<string, string>) {
  const request = new NextRequest('http://localhost/api/invite/consume', {
    method: 'POST',
  });
  for (const [name, value] of Object.entries(cookies)) {
    request.cookies.set(name, value);
  }
  return request;
}

const joinCodeCookies = {
  invite_token: `jc:${CODE_ID}`,
  invite_library: LIB,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockMemberCreate.mockResolvedValue({});
  mockMemberUpdate.mockResolvedValue({});
  mockMemberUpdateMany.mockResolvedValue({ count: 1 });
  mockInvitationUpdateMany.mockResolvedValue({ count: 1 });
  mockRecordJoinCodeUse.mockResolvedValue(undefined);
  mockCollectionFindUnique.mockResolvedValue({ ownerId: 'owner_1' });
  mockGetServerSession.mockResolvedValue({
    user: { id: 'u1', email: 'stranger@example.com' },
  });
});

describe('POST /api/invite/consume — jc: join code cookies', () => {
  it('sees the cookies it was sent', async () => {
    const request = post(joinCodeCookies);
    expect(request.cookies.get('invite_token')?.value).toBe(`jc:${CODE_ID}`);
  });

  it('creates membership and lands the user in the library', async () => {
    mockMemberFindUnique.mockResolvedValue(null);

    const res = await POST(post(joinCodeCookies));
    const body = await res.json();

    expect(mockMemberCreate).toHaveBeenCalled();
    expect(body.redirect).toBe(`/library/${LIB}`);
  });

  // Bearer by design: there is no address on a join code to match a session
  // against, so applying the binding check would refuse every arrival.
  it('never runs the binding check — no invitation is looked up', async () => {
    mockMemberFindUnique.mockResolvedValue(null);

    const res = await POST(post(joinCodeCookies));
    const body = await res.json();

    expect(mockInvitationFindFirst).not.toHaveBeenCalled();
    expect(body.error).toBeUndefined();
    expect(body.redirect).toBe(`/library/${LIB}`);
  });

  it('records which code brought the member in', async () => {
    mockMemberFindUnique.mockResolvedValue(null);

    await POST(post(joinCodeCookies));

    expect(mockMemberUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', collectionId: LIB },
      data: { joinedViaCodeId: CODE_ID },
    });
    expect(mockRecordJoinCodeUse).toHaveBeenCalledWith(CODE_ID);
  });

  it('burns nothing — a join code survives being used', async () => {
    mockMemberFindUnique.mockResolvedValue(null);

    await POST(post(joinCodeCookies));

    expect(mockInvitationUpdateMany).not.toHaveBeenCalled();
  });

  it('does not count a use for someone already a member', async () => {
    mockMemberFindUnique.mockResolvedValue({ id: 'm1', isActive: true });

    await POST(post(joinCodeCookies));

    expect(mockRecordJoinCodeUse).not.toHaveBeenCalled();
    expect(mockMemberUpdateMany).not.toHaveBeenCalled();
  });

  it('does not count a use for the owner', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'owner_1', email: 'owner@example.com' },
    });

    await POST(post(joinCodeCookies));

    expect(mockRecordJoinCodeUse).not.toHaveBeenCalled();
    expect(mockMemberCreate).not.toHaveBeenCalled();
  });

  it('clears the invite cookies', async () => {
    mockMemberFindUnique.mockResolvedValue(null);

    const res = await POST(post(joinCodeCookies));

    expect(res.cookies.get('invite_token')?.value).toBe('');
    expect(res.cookies.get('invite_library')?.value).toBe('');
  });
});

describe('POST /api/invite/consume — personal invitation tokens are unaffected', () => {
  it('still validates and burns a real token', async () => {
    mockMemberFindUnique.mockResolvedValue(null);
    mockInvitationFindFirst.mockResolvedValue({
      libraryId: LIB,
      expiresAt: new Date(Date.now() + 86400000),
      email: 'stranger@example.com',
    });

    const res = await POST(
      post({ invite_token: 'tok_abc', invite_library: LIB })
    );
    const body = await res.json();

    expect(mockInvitationFindFirst).toHaveBeenCalled();
    expect(mockInvitationUpdateMany).toHaveBeenCalled();
    expect(mockRecordJoinCodeUse).not.toHaveBeenCalled();
    expect(body.redirect).toBe(`/library/${LIB}`);
  });

  it('still refuses a token bound to another address', async () => {
    mockInvitationFindFirst.mockResolvedValue({
      libraryId: LIB,
      expiresAt: new Date(Date.now() + 86400000),
      email: 'dave@example.com',
    });

    const res = await POST(
      post({ invite_token: 'tok_abc', invite_library: LIB })
    );
    const body = await res.json();

    expect(body.error).toBe('invite_bound_to_other_email');
    expect(mockMemberCreate).not.toHaveBeenCalled();
  });
});

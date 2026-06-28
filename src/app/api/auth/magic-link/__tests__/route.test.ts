import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockInvitationFindFirst = vi.hoisted(() => vi.fn());
const mockInvitationUpdate = vi.hoisted(() => vi.fn());
const mockInvitationUpdateMany = vi.hoisted(() => vi.fn());
const mockUserUpsert = vi.hoisted(() => vi.fn());
const mockMemberFindUnique = vi.hoisted(() => vi.fn());
const mockMemberCreate = vi.hoisted(() => vi.fn());
const mockMemberUpdate = vi.hoisted(() => vi.fn());
const mockStoreAuthCode = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  db: {
    invitation: {
      findFirst: mockInvitationFindFirst,
      update: mockInvitationUpdate,
      updateMany: mockInvitationUpdateMany,
    },
    user: { upsert: mockUserUpsert },
    collectionMember: {
      findUnique: mockMemberFindUnique,
      create: mockMemberCreate,
      update: mockMemberUpdate,
    },
  },
}));
vi.mock('@/lib/auth-codes', () => ({ storeAuthCode: mockStoreAuthCode }));

import { GET } from '../route';

const TOKEN = 'tok_abc';
const LIBRARY_ID = 'lib_1';
const USER_ID = 'user_1';
const EMAIL = 'test@example.com';

function makeRequest(token?: string) {
  const url = token
    ? `http://localhost/api/auth/magic-link?token=${token}`
    : 'http://localhost/api/auth/magic-link';
  return new NextRequest(url);
}

describe('GET /api/auth/magic-link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvitationFindFirst.mockResolvedValue({
      id: 'inv_1',
      token: TOKEN,
      email: EMAIL,
      libraryId: LIBRARY_ID,
      expiresAt: new Date(Date.now() + 86400000),
      collection: { id: LIBRARY_ID, name: 'Test Library' },
    });
    mockUserUpsert.mockResolvedValue({ id: USER_ID, email: EMAIL });
    mockMemberFindUnique.mockResolvedValue(null);
    mockMemberCreate.mockResolvedValue({ id: 'mem_1' });
    mockInvitationUpdateMany.mockResolvedValue({ count: 1 });
    mockStoreAuthCode.mockResolvedValue(undefined);
  });

  it('processes valid invite: creates membership and redirects to signin', async () => {
    const res = await GET(makeRequest(TOKEN));
    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/auth/signin');
    expect(location).toContain('magic=true');
    expect(location).toContain('auto=true');
    expect(mockMemberCreate).toHaveBeenCalled();
    expect(mockInvitationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ACCEPTED' }),
      })
    );
  });

  it('redirects to error when token is missing', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain(
      '/auth/error?error=invalid_invitation'
    );
  });

  it('redirects to error when invitation is not found', async () => {
    mockInvitationFindFirst.mockResolvedValue(null);
    const res = await GET(makeRequest(TOKEN));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain(
      '/auth/error?error=invitation_not_found'
    );
  });

  it('redirects to error and marks EXPIRED when invite is past expiry', async () => {
    mockInvitationFindFirst.mockResolvedValue({
      id: 'inv_1',
      token: TOKEN,
      email: EMAIL,
      libraryId: LIBRARY_ID,
      expiresAt: new Date(Date.now() - 1000),
      collection: { id: LIBRARY_ID, name: 'Test Library' },
    });
    const res = await GET(makeRequest(TOKEN));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain(
      '/auth/error?error=invitation_expired'
    );
    expect(mockInvitationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'EXPIRED' } })
    );
  });
});

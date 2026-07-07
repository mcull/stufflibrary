import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockInvitationFindFirst = vi.hoisted(() => vi.fn());
const mockCollectionFindUnique = vi.hoisted(() => vi.fn());
const mockInvitationUpdate = vi.hoisted(() => vi.fn());
const mockInvitationUpdateMany = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockMemberFindUnique = vi.hoisted(() => vi.fn());
const mockMemberCreate = vi.hoisted(() => vi.fn());
const mockMemberUpdate = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({
  db: {
    invitation: {
      findFirst: mockInvitationFindFirst,
      update: mockInvitationUpdate,
      updateMany: mockInvitationUpdateMany,
    },
    collection: { findUnique: mockCollectionFindUnique },
    user: { findUnique: mockUserFindUnique },
    collectionMember: {
      findUnique: mockMemberFindUnique,
      create: mockMemberCreate,
      update: mockMemberUpdate,
    },
  },
}));

import { POST } from '../route';

const TOKEN = 'tok_abc';
const USER_ID = 'user_1';
const LIBRARY_ID = 'lib_1';
const EMAIL = 'test@example.com';

function makeRequest() {
  return new NextRequest(`http://localhost/api/invitations/${TOKEN}/accept`, {
    method: 'POST',
  });
}

const validInvitation = {
  id: 'inv_1',
  token: TOKEN,
  email: EMAIL,
  libraryId: LIBRARY_ID,
  expiresAt: new Date(Date.now() + 86400000),
  collection: {
    id: LIBRARY_ID,
    name: 'Test Library',
    location: 'London',
    owner: { name: 'Alice' },
  },
};

describe('POST /api/invitations/[token]/accept', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // ensureActiveMembership's owner-guard lookup (#409): not the owner.
    mockCollectionFindUnique.mockResolvedValue({ ownerId: 'someone-else' });
    mockGetServerSession.mockResolvedValue({ user: { id: USER_ID } });
    mockInvitationFindFirst.mockResolvedValue(validInvitation);
    // user email matches invitation email
    mockUserFindUnique.mockResolvedValue({ email: EMAIL, name: 'Test User' });
    mockMemberFindUnique.mockResolvedValue(null); // no existing membership
    mockMemberCreate.mockResolvedValue({ id: 'mem_1', role: 'member' });
    mockInvitationUpdateMany.mockResolvedValue({ count: 1 });
  });

  it('creates membership and returns success for new member', async () => {
    const res = await POST(makeRequest(), {
      params: Promise.resolve({ token: TOKEN }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.library.id).toBe(LIBRARY_ID);
    expect(body.library.role).toBe('member');
    expect(body.user).toBeDefined();
    expect(mockMemberCreate).toHaveBeenCalled();
    expect(mockInvitationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ACCEPTED' }),
      })
    );
  });

  it('returns already-member response when membership exists', async () => {
    mockMemberFindUnique.mockResolvedValue({ id: 'mem_1', isActive: true });

    const res = await POST(makeRequest(), {
      params: Promise.resolve({ token: TOKEN }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('already a member');
    expect(mockMemberCreate).not.toHaveBeenCalled();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(makeRequest(), {
      params: Promise.resolve({ token: TOKEN }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 when email does not match invitation', async () => {
    mockUserFindUnique.mockResolvedValue({
      email: 'other@example.com',
      name: 'Other',
    });
    const res = await POST(makeRequest(), {
      params: Promise.resolve({ token: TOKEN }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 404 when invitation not found', async () => {
    mockInvitationFindFirst.mockResolvedValue(null);
    const res = await POST(makeRequest(), {
      params: Promise.resolve({ token: TOKEN }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 400 and marks EXPIRED when invite is past expiry', async () => {
    mockInvitationFindFirst.mockResolvedValue({
      ...validInvitation,
      expiresAt: new Date(Date.now() - 1000),
    });
    const res = await POST(makeRequest(), {
      params: Promise.resolve({ token: TOKEN }),
    });
    expect(res.status).toBe(400);
    expect(mockInvitationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'EXPIRED' } })
    );
  });
});

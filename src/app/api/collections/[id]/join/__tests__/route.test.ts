import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockCollectionFindUnique = vi.hoisted(() => vi.fn());
const mockInvitationFindFirst = vi.hoisted(() => vi.fn());
const mockMemberFindUnique = vi.hoisted(() => vi.fn());
const mockMemberCreate = vi.hoisted(() => vi.fn());
const mockMemberUpdate = vi.hoisted(() => vi.fn());
const mockInvitationUpdateMany = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({
  db: {
    collection: { findUnique: mockCollectionFindUnique },
    invitation: {
      findFirst: mockInvitationFindFirst,
      updateMany: mockInvitationUpdateMany,
    },
    collectionMember: {
      findUnique: mockMemberFindUnique,
      create: mockMemberCreate,
      update: mockMemberUpdate,
    },
  },
}));

import { POST } from '../route';

const COLLECTION_ID = 'lib_1';
const USER_ID = 'user_1';
const OWNER_ID = 'owner_1';

function makeRequest(cookies: Record<string, string> = {}) {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
  const headers: Record<string, string> = {};
  if (cookieHeader) headers['cookie'] = cookieHeader;
  return new NextRequest(
    `http://localhost/api/collections/${COLLECTION_ID}/join`,
    { method: 'POST', headers }
  );
}

function publicCollectionReturn() {
  return {
    id: COLLECTION_ID,
    name: 'Test Library',
    isPublic: true,
    ownerId: OWNER_ID,
  };
}

function updatedCollectionReturn() {
  return {
    id: COLLECTION_ID,
    name: 'Test Library',
    description: null,
    location: null,
    isPublic: true,
    owner: { id: OWNER_ID, name: 'Owner', image: null },
    _count: { members: 1, items: 0 },
  };
}

describe('POST /api/collections/[id]/join', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockResolvedValue({ user: { id: USER_ID } });
    mockCollectionFindUnique
      .mockResolvedValueOnce(publicCollectionReturn())
      .mockResolvedValueOnce(updatedCollectionReturn());
    mockMemberFindUnique.mockResolvedValue(null);
    mockMemberCreate.mockResolvedValue({ id: 'mem_1', role: 'member' });
    mockInvitationUpdateMany.mockResolvedValue({ count: 0 });
  });

  it('creates membership and returns 201 for a public collection', async () => {
    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: COLLECTION_ID }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.message).toBe('Successfully joined collection');
    expect(mockMemberCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          collectionId: COLLECTION_ID,
        }),
      })
    );
  });

  it('returns 400 when user is already an active member (P0-13 duplicate-guard)', async () => {
    // ensureActiveMembership's findUnique sees an active membership → no-op → 400
    mockMemberFindUnique.mockResolvedValue({ id: 'mem_1', isActive: true });

    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: COLLECTION_ID }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('You are already a member of this collection');
    expect(mockMemberCreate).not.toHaveBeenCalled();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: COLLECTION_ID }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 for private collection without invite', async () => {
    mockCollectionFindUnique.mockReset();
    mockCollectionFindUnique.mockResolvedValue({
      id: COLLECTION_ID,
      name: 'Private Library',
      isPublic: false,
      ownerId: OWNER_ID,
    });
    mockInvitationFindFirst.mockResolvedValue(null);

    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: COLLECTION_ID }),
    });
    expect(res.status).toBe(403);
  });
});

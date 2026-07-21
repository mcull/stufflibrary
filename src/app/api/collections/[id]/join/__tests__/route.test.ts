import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockCollectionFindUnique = vi.hoisted(() => vi.fn());
const mockInvitationFindFirst = vi.hoisted(() => vi.fn());
const mockMemberFindUnique = vi.hoisted(() => vi.fn());
const mockMemberCreate = vi.hoisted(() => vi.fn());
const mockMemberUpdate = vi.hoisted(() => vi.fn());
const mockInvitationUpdateMany = vi.hoisted(() => vi.fn());
const mockJoinCodeFindFirst = vi.hoisted(() => vi.fn());
const mockJoinCodeUpdate = vi.hoisted(() => vi.fn());
const mockMemberUpdateMany = vi.hoisted(() => vi.fn());

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
      updateMany: mockMemberUpdateMany,
    },
    joinCode: {
      findFirst: mockJoinCodeFindFirst,
      update: mockJoinCodeUpdate,
    },
  },
}));

import { POST } from '../route';

const COLLECTION_ID = 'lib_1';
const USER_ID = 'user_1';
const OWNER_ID = 'owner_1';

/**
 * A hand-rolled stand-in rather than a real NextRequest. Under happy-dom,
 * `new NextRequest(url, { headers })` silently drops the headers — the cookie
 * header comes back null — so a NextRequest-based helper can only ever test
 * the no-cookie path, which is how the cookie branches went uncovered.
 */
function makeRequest(
  cookies: Record<string, string> = {},
  body: Record<string, unknown> = {}
) {
  return {
    url: `http://localhost/api/collections/${COLLECTION_ID}/join`,
    method: 'POST',
    cookies: {
      get: (name: string) =>
        cookies[name] === undefined ? undefined : { value: cookies[name] },
    },
    json: async () => body,
  } as never;
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
      // ensureActiveMembership's owner-guard lookup (#409)
      .mockResolvedValueOnce({ ownerId: OWNER_ID })
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

describe('POST /api/collections/[id]/join — join code cookies', () => {
  const CODE_ID = 'jc_1';
  let storedCode: Record<string, unknown> | null = null;

  function privateCollection() {
    return {
      id: COLLECTION_ID,
      name: 'Private Library',
      isPublic: false,
      ownerId: OWNER_ID,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks leaves queued `Once` values in place, and the refusal
    // tests consume fewer than they queue. Without a reset the leftovers slide
    // into the next test and hand it somebody else's collection.
    mockCollectionFindUnique.mockReset();
    mockGetServerSession.mockResolvedValue({ user: { id: USER_ID } });
    mockCollectionFindUnique
      .mockResolvedValueOnce(privateCollection())
      .mockResolvedValueOnce({ ownerId: OWNER_ID })
      .mockResolvedValueOnce(updatedCollectionReturn());
    mockMemberFindUnique.mockResolvedValue(null);
    mockMemberCreate.mockResolvedValue({ id: 'mem_1', role: 'member' });
    mockMemberUpdateMany.mockResolvedValue({ count: 1 });
    mockJoinCodeUpdate.mockResolvedValue({ id: CODE_ID });
    storedCode = {
      id: CODE_ID,
      collectionId: COLLECTION_ID,
      isActive: true,
    };
    // Applies the where clause for real, so dropping either the isActive or
    // the collectionId filter shows up as a failure here.
    mockJoinCodeFindFirst.mockImplementation(({ where }: any) => {
      if (!storedCode) return null;
      const matches = Object.entries(where).every(
        ([key, value]) => storedCode![key] === value
      );
      return matches ? storedCode : null;
    });
    // A `jc:` value can never be an Invitation token; make that explicit so a
    // pass cannot be coming through the invitation branch.
    mockInvitationFindFirst.mockResolvedValue(null);
  });

  it('lets a live join code join a private library', async () => {
    const res = await POST(
      makeRequest({
        invite_token: `jc:${CODE_ID}`,
        invite_library: COLLECTION_ID,
      }),
      { params: Promise.resolve({ id: COLLECTION_ID }) }
    );

    expect(res.status).toBe(201);
    expect(mockMemberCreate).toHaveBeenCalled();
  });

  it('credits the code that brought them in and ticks its counter', async () => {
    await POST(
      makeRequest({
        invite_token: `jc:${CODE_ID}`,
        invite_library: COLLECTION_ID,
      }),
      { params: Promise.resolve({ id: COLLECTION_ID }) }
    );

    expect(mockMemberUpdateMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, collectionId: COLLECTION_ID },
      data: { joinedViaCodeId: CODE_ID },
    });
    expect(mockJoinCodeUpdate).toHaveBeenCalledWith({
      where: { id: CODE_ID },
      data: { useCount: { increment: 1 } },
    });
  });

  it('never marks an invitation accepted on a join code', async () => {
    await POST(
      makeRequest({
        invite_token: `jc:${CODE_ID}`,
        invite_library: COLLECTION_ID,
      }),
      { params: Promise.resolve({ id: COLLECTION_ID }) }
    );

    expect(mockInvitationUpdateMany).not.toHaveBeenCalled();
  });

  it('refuses a join code for a different library', async () => {
    storedCode = { ...storedCode!, collectionId: 'lib_elsewhere' };

    const res = await POST(
      makeRequest({
        invite_token: `jc:${CODE_ID}`,
        invite_library: COLLECTION_ID,
      }),
      { params: Promise.resolve({ id: COLLECTION_ID }) }
    );

    expect(res.status).toBe(403);
    expect(mockMemberCreate).not.toHaveBeenCalled();
  });

  it('refuses a rotated-away join code', async () => {
    // Deactivated, not absent. A mock that returned null regardless of the
    // where clause would pass against a lookup that never filtered on
    // isActive at all.
    storedCode = { ...storedCode!, isActive: false };

    const res = await POST(
      makeRequest({
        invite_token: `jc:${CODE_ID}`,
        invite_library: COLLECTION_ID,
      }),
      { params: Promise.resolve({ id: COLLECTION_ID }) }
    );

    expect(res.status).toBe(403);
    expect(mockMemberCreate).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockCollectionFindUnique = vi.hoisted(() => vi.fn());
const mockItemFindMany = vi.hoisted(() => vi.fn());
const mockInvitationFindFirst = vi.hoisted(() => vi.fn());
const mockJoinCodeFindFirst = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({
  db: {
    collection: { findUnique: mockCollectionFindUnique },
    item: { findMany: mockItemFindMany },
    invitation: { findFirst: mockInvitationFindFirst },
    joinCode: { findFirst: mockJoinCodeFindFirst },
  },
}));

import { GET } from '../route';

const LIBRARY_ID = 'lib_1';
const OTHER_LIBRARY_ID = 'lib_2';
const OWNER_ID = 'owner_1';
const CODE_ID = 'jc_1';

function address(latitude: number | null, longitude: number | null) {
  return { city: 'San Francisco', state: 'CA', latitude, longitude };
}

function library(overrides: Record<string, unknown> = {}) {
  return {
    id: LIBRARY_ID,
    name: 'Bernal Tools',
    description: null,
    location: 'Bernal Heights',
    // Private on purpose: the whole point of the guest preview is that it
    // works for a library that refuses anonymous viewers.
    isPublic: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    ownerId: OWNER_ID,
    inviteRateLimitPerHour: 0,
    owner: {
      id: OWNER_ID,
      name: 'Ada Owner',
      image: 'https://cdn.example/ada.png',
      status: 'active',
      addresses: [address(37.774929, -122.419416)],
    },
    members: [
      {
        id: 'cm_1',
        userId: 'member_1',
        role: 'member',
        joinedAt: new Date('2026-01-03'),
        user: {
          id: 'member_1',
          name: 'Grace Member',
          image: null,
          status: 'active',
          addresses: [address(37.7712, -122.4155)],
        },
      },
    ],
    _count: { members: 1 },
    ...overrides,
  };
}

function request(cookies: Record<string, string> = {}) {
  return {
    url: `http://t/api/collections/${LIBRARY_ID}`,
    cookies: {
      get: (name: string) =>
        cookies[name] === undefined ? undefined : { value: cookies[name] },
    },
  } as never;
}

async function callGET(cookies?: Record<string, string>) {
  const res = await GET(request(cookies), {
    params: Promise.resolve({ id: LIBRARY_ID }),
  });
  return { status: res.status, body: await res.json() };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockItemFindMany.mockResolvedValue([]);
  mockCollectionFindUnique.mockResolvedValue(library());
  // No Invitation ever matches a `jc:` value; make that explicit so a test
  // that passes cannot be passing through the invitation branch.
  mockInvitationFindFirst.mockResolvedValue(null);
});

describe('GET /api/collections/[id] — join code guest preview', () => {
  it('gives the holder of a live join code the redacted guest payload', async () => {
    mockGetServerSession.mockResolvedValue(null);
    mockJoinCodeFindFirst.mockResolvedValue({
      id: CODE_ID,
      collectionId: LIBRARY_ID,
      isActive: true,
    });

    const { status, body } = await callGET({
      invite_token: `jc:${CODE_ID}`,
      invite_library: LIBRARY_ID,
    });

    expect(status).toBe(200);
    expect(body.collection.userRole).toBe('guest');
    expect(body.collection.members).toEqual([]);
    expect(body.collection.memberAreas).toEqual([
      { lat: 37.77, lng: -122.42, count: 2 },
    ]);
    expect(JSON.stringify(body)).not.toContain('Grace Member');
  });

  it('looks the code up by id and only while it is active', async () => {
    mockGetServerSession.mockResolvedValue(null);
    mockJoinCodeFindFirst.mockResolvedValue({
      id: CODE_ID,
      collectionId: LIBRARY_ID,
      isActive: true,
    });

    await callGET({
      invite_token: `jc:${CODE_ID}`,
      invite_library: LIBRARY_ID,
    });

    expect(mockJoinCodeFindFirst).toHaveBeenCalledWith({
      where: { id: CODE_ID, isActive: true },
    });
  });

  it('refuses a join code belonging to a different library', async () => {
    mockGetServerSession.mockResolvedValue(null);
    // The row exists and is live — it is simply for somebody else's library.
    // The cookie claims otherwise; the database is what decides.
    mockJoinCodeFindFirst.mockResolvedValue({
      id: CODE_ID,
      collectionId: OTHER_LIBRARY_ID,
      isActive: true,
    });

    const { status, body } = await callGET({
      invite_token: `jc:${CODE_ID}`,
      invite_library: LIBRARY_ID,
    });

    expect(status).toBe(403);
    expect(body.error).toBe('Access denied');
  });

  it('refuses a rotated-away join code', async () => {
    mockGetServerSession.mockResolvedValue(null);
    // isActive: true is in the where clause, so a dead row comes back null.
    mockJoinCodeFindFirst.mockResolvedValue(null);

    const { status } = await callGET({
      invite_token: `jc:${CODE_ID}`,
      invite_library: LIBRARY_ID,
    });

    expect(status).toBe(403);
  });

  it('never treats a `jc:` value as an invitation token', async () => {
    mockGetServerSession.mockResolvedValue(null);
    mockJoinCodeFindFirst.mockResolvedValue({
      id: CODE_ID,
      collectionId: LIBRARY_ID,
      isActive: true,
    });

    await callGET({
      invite_token: `jc:${CODE_ID}`,
      invite_library: LIBRARY_ID,
    });

    expect(mockInvitationFindFirst).not.toHaveBeenCalled();
  });

  it('still honours a plain invitation token', async () => {
    mockGetServerSession.mockResolvedValue(null);
    mockInvitationFindFirst.mockResolvedValue({ id: 'inv_1' });

    const { status, body } = await callGET({
      invite_token: 'tok_1',
      invite_library: LIBRARY_ID,
    });

    expect(status).toBe(200);
    expect(body.collection.userRole).toBe('guest');
    expect(mockJoinCodeFindFirst).not.toHaveBeenCalled();
  });
});

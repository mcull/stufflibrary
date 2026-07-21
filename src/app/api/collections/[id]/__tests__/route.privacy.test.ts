import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockCollectionFindUnique = vi.hoisted(() => vi.fn());
const mockItemFindMany = vi.hoisted(() => vi.fn());
const mockInvitationFindFirst = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({
  db: {
    collection: { findUnique: mockCollectionFindUnique },
    item: { findMany: mockItemFindMany },
    invitation: { findFirst: mockInvitationFindFirst },
  },
}));

import { GET } from '../route';

const LIBRARY_ID = 'lib_1';
const OWNER_ID = 'owner_1';
const MEMBER_ID = 'member_1';

// Deliberately fatter than the select: if the query ever regains these fields,
// the route must still refuse to serialize them.
function address(latitude: number | null, longitude: number | null) {
  return {
    address1: '123 Precise Street',
    formattedAddress: '123 Precise Street, San Francisco, CA 94110',
    city: 'San Francisco',
    state: 'CA',
    zip: '94110',
    latitude,
    longitude,
  };
}

function library(overrides: Record<string, unknown> = {}) {
  return {
    id: LIBRARY_ID,
    name: 'Bernal Tools',
    description: null,
    location: 'Bernal Heights',
    isPublic: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    ownerId: OWNER_ID,
    inviteRateLimitPerHour: 0,
    owner: {
      id: OWNER_ID,
      name: 'Ada Owner',
      email: 'ada@example.com',
      image: 'https://cdn.example/ada.png',
      status: 'active',
      addresses: [address(37.774929, -122.419416)],
    },
    members: [
      {
        id: 'cm_1',
        userId: MEMBER_ID,
        role: 'member',
        joinedAt: new Date('2026-01-03'),
        user: {
          id: MEMBER_ID,
          name: 'Grace Member',
          email: 'grace@example.com',
          image: 'https://cdn.example/grace.png',
          status: 'active',
          addresses: [address(37.7712, -122.4155)],
        },
      },
      {
        id: 'cm_2',
        userId: 'member_2',
        role: 'member',
        joinedAt: new Date('2026-01-04'),
        user: {
          id: 'member_2',
          name: 'Unlocated Member',
          email: 'nowhere@example.com',
          image: null,
          status: 'active',
          addresses: [],
        },
      },
    ],
    _count: { members: 2 },
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
  mockInvitationFindFirst.mockResolvedValue({ id: 'inv_1' });
});

describe('GET /api/collections/[id] — member location privacy', () => {
  it('gives a member the exact coordinates of their neighbours', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: MEMBER_ID } });

    const { status, body } = await callGET();

    expect(status).toBe(200);
    expect(body.collection.userRole).toBe('member');
    const grace = body.collection.members.find(
      (m: any) => m.user.id === MEMBER_ID
    );
    expect(grace.user.addresses[0]).toMatchObject({
      latitude: 37.7712,
      longitude: -122.4155,
    });
    expect(body.collection.members).toHaveLength(3); // owner + 2 members
  });

  it('never sends email, address1 or formattedAddress — not even to members', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: MEMBER_ID } });

    const { body } = await callGET();

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain('email');
    expect(serialized).not.toContain('address1');
    expect(serialized).not.toContain('formattedAddress');
  });

  it('does not ask the database for email or street address at all', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: MEMBER_ID } });

    await callGET();

    const query = JSON.stringify(mockCollectionFindUnique.mock.calls[0]?.[0]);
    expect(query).not.toContain('email');
    expect(query).not.toContain('address1');
    expect(query).not.toContain('formattedAddress');
    expect(query).toContain('latitude');
  });

  it('gives an invited guest only rounded, merged areas — no identities', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const { status, body } = await callGET({
      invite_token: 'tok_1',
      invite_library: LIBRARY_ID,
    });

    expect(status).toBe(200);
    expect(body.collection.userRole).toBe('guest');
    expect(body.collection.members).toEqual([]);

    // The owner and the located member both round into one shared area; the
    // member without coordinates is dropped rather than invented at 0,0.
    expect(body.collection.memberAreas).toEqual([
      { lat: 37.77, lng: -122.42, count: 2 },
    ]);

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain('Ada Owner');
    expect(serialized).not.toContain('Grace Member');
    expect(serialized).not.toContain('cdn.example');
    expect(serialized).not.toContain('37.7712');
    expect(serialized).not.toContain('-122.419416');
    expect(serialized).not.toContain('San Francisco');
  });

  it('still tells a guest how many neighbours there are', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const { body } = await callGET({
      invite_token: 'tok_1',
      invite_library: LIBRARY_ID,
    });

    expect(body.collection.memberCount).toBe(3);
  });

  it('treats an anonymous viewer of a public library as a guest, not a member', async () => {
    mockCollectionFindUnique.mockResolvedValue(library({ isPublic: true }));
    mockGetServerSession.mockResolvedValue(null);

    // No session, no invite cookie for this library — the public-library path.
    const { status, body } = await callGET({ invite_token: 'tok_1' });

    expect(status).toBe(200);
    expect(body.collection.userRole).toBeNull();
    expect(body.collection.members).toEqual([]);
    expect(body.collection.memberAreas).toEqual([
      { lat: 37.77, lng: -122.42, count: 2 },
    ]);
    expect(JSON.stringify(body)).not.toContain('Grace Member');
  });

  it('gives the owner the full member list', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: OWNER_ID } });

    const { body } = await callGET();

    expect(body.collection.userRole).toBe('owner');
    expect(body.collection.members).toHaveLength(3);
    expect(body.collection.owner.name).toBe('Ada Owner');
    expect(body.collection.memberAreas).toEqual([]);
  });
});

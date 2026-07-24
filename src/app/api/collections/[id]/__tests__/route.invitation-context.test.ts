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
const OWNER_ID = 'owner_1';
const CODE_ID = 'jc_1';

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
      image: 'https://cdn.example/ada.png',
      status: 'active',
      addresses: [],
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
          addresses: [],
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
  mockInvitationFindFirst.mockResolvedValue(null);
});

describe('GET /api/collections/[id] — invitationContext', () => {
  it('gives a bound-invite guest the inviter first name', async () => {
    mockGetServerSession.mockResolvedValue(null);
    // The invite lookup must select the sender's name for this to resolve.
    mockInvitationFindFirst.mockResolvedValue({
      id: 'inv_1',
      sender: { name: 'Marc Cull' },
    });

    const { body } = await callGET({
      invite_token: 'tok_1',
      invite_library: LIBRARY_ID,
    });

    expect(body.collection.userRole).toBe('guest');
    expect(body.collection.invitationContext).toEqual({
      kind: 'personal',
      inviterName: 'Marc',
    });
  });

  it('gives a join-code guest the owner first name as host', async () => {
    mockGetServerSession.mockResolvedValue(null);
    mockJoinCodeFindFirst.mockResolvedValue({
      id: CODE_ID,
      collectionId: LIBRARY_ID,
      isActive: true,
    });

    const { body } = await callGET({
      invite_token: `jc:${CODE_ID}`,
      invite_library: LIBRARY_ID,
    });

    expect(body.collection.userRole).toBe('guest');
    expect(body.collection.invitationContext).toEqual({
      kind: 'code',
      inviterName: 'Ada',
    });
  });

  it('gives the owner no invitationContext', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: OWNER_ID } });

    const { body } = await callGET();

    expect(body.collection.userRole).toBe('owner');
    expect(body.collection.invitationContext).toBeNull();
  });

  it('leaks no identifiers beyond the first name', async () => {
    mockGetServerSession.mockResolvedValue(null);
    mockInvitationFindFirst.mockResolvedValue({
      id: 'inv_1',
      sender: { name: 'Marc Cull' },
    });

    const { body } = await callGET({
      invite_token: 'tok_1',
      invite_library: LIBRARY_ID,
    });

    const ctx = body.collection.invitationContext;
    expect(Object.keys(ctx).sort()).toEqual(['inviterName', 'kind']);
    expect(JSON.stringify(ctx)).not.toContain('Cull'); // surname dropped
    expect(body.collection.owner).toBeNull(); // #497 redaction intact
  });
});

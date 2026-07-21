import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockGetUserCapabilities = vi.hoisted(() => vi.fn());
const mockJoinCodeFindMany = vi.hoisted(() => vi.fn());
const mockJoinCodeCreate = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/user-capabilities', () => ({
  getUserCapabilities: mockGetUserCapabilities,
}));
vi.mock('@/lib/db', () => ({
  db: {
    joinCode: { findMany: mockJoinCodeFindMany, create: mockJoinCodeCreate },
  },
}));

import { GET, POST } from '../route';

const LIBRARY_ID = 'lib_1';
const USER_ID = 'user_1';

function makeRequest(body: Record<string, unknown> = {}) {
  return {
    url: `http://t/api/collections/${LIBRARY_ID}/join-codes`,
    json: async () => body,
  } as never;
}

const params = { params: Promise.resolve({ id: LIBRARY_ID }) };

function code(overrides: Record<string, unknown> = {}) {
  return {
    id: 'jc_1',
    code: 'XKF72M9Q',
    label: 'corkboard flyer',
    useCount: 14,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: USER_ID } });
  mockGetUserCapabilities.mockResolvedValue({ canInvite: true, reasons: {} });
  mockJoinCodeFindMany.mockResolvedValue([code()]);
  mockJoinCodeCreate.mockImplementation(({ data }: any) => ({
    id: 'jc_new',
    useCount: 0,
    createdAt: new Date('2026-02-01'),
    ...data,
  }));
});

describe('GET /api/collections/[id]/join-codes', () => {
  it('returns the active codes for the library', async () => {
    const res = await GET(makeRequest(), params);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.codes).toHaveLength(1);
    expect(body.codes[0]).toMatchObject({
      id: 'jc_1',
      code: 'XKF72M9Q',
      label: 'corkboard flyer',
      useCount: 14,
    });
  });

  it('asks only for this library and only for live codes', async () => {
    await GET(makeRequest(), params);

    expect(mockJoinCodeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { collectionId: LIBRARY_ID, isActive: true },
      })
    );
  });

  it('shows BOTH codes when a failed rotation left two sharing a label', async () => {
    // rotateJoinCode creates the replacement before deactivating the old row,
    // precisely so a failed deactivation leaves two live codes rather than
    // zero. That state is survivable only because an admin can SEE it and
    // rotate again. Collapsing or deduplicating by label here would hide the
    // one failure the ordering exists to make visible.
    mockJoinCodeFindMany.mockResolvedValue([
      code({ id: 'jc_replacement', code: 'AAAA1111', useCount: 0 }),
      code({ id: 'jc_stranded', code: 'BBBB2222', useCount: 14 }),
    ]);

    const res = await GET(makeRequest(), params);
    const body = await res.json();

    expect(body.codes).toHaveLength(2);
    expect(body.codes.map((c: any) => c.id)).toEqual([
      'jc_replacement',
      'jc_stranded',
    ]);
    expect(body.codes.map((c: any) => c.code)).toEqual([
      'AAAA1111',
      'BBBB2222',
    ]);
    // Both carry the same label; neither may be folded into the other.
    expect(body.codes.every((c: any) => c.label === 'corkboard flyer')).toBe(
      true
    );
  });

  it('refuses a caller who cannot invite', async () => {
    mockGetUserCapabilities.mockResolvedValue({
      canInvite: false,
      reasons: { canInvite: 'NEEDS_PHOTO' },
    });

    const res = await GET(makeRequest(), params);

    expect(res.status).toBe(403);
    expect(mockJoinCodeFindMany).not.toHaveBeenCalled();
  });

  it('scopes the capability check to this library', async () => {
    await GET(makeRequest(), params);

    expect(mockGetUserCapabilities).toHaveBeenCalledWith(USER_ID, {
      libraryId: LIBRARY_ID,
    });
  });

  it('refuses an anonymous caller', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await GET(makeRequest(), params);

    expect(res.status).toBe(401);
    expect(mockGetUserCapabilities).not.toHaveBeenCalled();
  });
});

describe('POST /api/collections/[id]/join-codes', () => {
  it('mints a code and returns 201', async () => {
    const res = await POST(makeRequest({ label: 'corkboard flyer' }), params);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.code.code).toHaveLength(8);
    expect(body.code.label).toBe('corkboard flyer');
    expect(mockJoinCodeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          collectionId: LIBRARY_ID,
          createdById: USER_ID,
          label: 'corkboard flyer',
        }),
      })
    );
  });

  it('accepts a body with no label at all', async () => {
    const res = await POST(makeRequest(), params);

    expect(res.status).toBe(201);
    expect(mockJoinCodeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ label: null }),
      })
    );
  });

  it('refuses a caller who cannot invite', async () => {
    mockGetUserCapabilities.mockResolvedValue({
      canInvite: false,
      reasons: { canInvite: 'NEEDS_TRUST_TIER' },
    });

    const res = await POST(makeRequest({ label: 'x' }), params);

    expect(res.status).toBe(403);
    expect(mockJoinCodeCreate).not.toHaveBeenCalled();
  });

  it('refuses an anonymous caller', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await POST(makeRequest({ label: 'x' }), params);

    expect(res.status).toBe(401);
    expect(mockJoinCodeCreate).not.toHaveBeenCalled();
  });
});

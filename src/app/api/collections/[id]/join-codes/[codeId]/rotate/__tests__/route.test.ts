import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockGetUserCapabilities = vi.hoisted(() => vi.fn());
const mockJoinCodeFindFirst = vi.hoisted(() => vi.fn());
const mockJoinCodeCreate = vi.hoisted(() => vi.fn());
const mockJoinCodeUpdate = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/user-capabilities', () => ({
  getUserCapabilities: mockGetUserCapabilities,
}));
vi.mock('@/lib/db', () => ({
  db: {
    joinCode: {
      findFirst: mockJoinCodeFindFirst,
      create: mockJoinCodeCreate,
      update: mockJoinCodeUpdate,
    },
  },
}));

import { POST } from '../route';

const LIBRARY_ID = 'lib_1';
const CODE_ID = 'jc_old';
const USER_ID = 'user_1';
const OLD_CODE = 'XKF72M9Q';

function makeRequest() {
  return {
    url: `http://t/api/collections/${LIBRARY_ID}/join-codes/${CODE_ID}/rotate`,
  } as never;
}

const params = {
  params: Promise.resolve({ id: LIBRARY_ID, codeId: CODE_ID }),
};

/**
 * The one row in the table. `findFirst` below actually applies the where
 * clause against it — a mock that returns a fixed row no matter what it was
 * asked would pass just as happily against a rotate that never scoped its
 * lookup at all, which is the bug the cross-library test is hunting.
 */
let storedCode: Record<string, unknown> | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  mockJoinCodeFindFirst.mockImplementation(({ where }: any) => {
    if (!storedCode) return null;
    const matches = Object.entries(where).every(
      ([key, value]) => storedCode![key] === value
    );
    return matches ? storedCode : null;
  });
  mockGetServerSession.mockResolvedValue({ user: { id: USER_ID } });
  mockGetUserCapabilities.mockResolvedValue({ canInvite: true, reasons: {} });
  storedCode = {
    id: CODE_ID,
    code: OLD_CODE,
    collectionId: LIBRARY_ID,
    label: 'corkboard flyer',
    isActive: true,
  };
  mockJoinCodeCreate.mockImplementation(({ data }: any) => ({
    id: 'jc_new',
    useCount: 0,
    ...data,
  }));
  mockJoinCodeUpdate.mockResolvedValue({ id: CODE_ID, isActive: false });
});

describe('POST /api/collections/[id]/join-codes/[codeId]/rotate', () => {
  it('returns the replacement, never the code it just revoked', async () => {
    const res = await POST(makeRequest(), params);

    expect(res.status).toBe(200);
    const body = await res.json();
    // Handing back the old code would tell an admin the paper they just
    // killed is the paper to print.
    expect(body.code.id).toBe('jc_new');
    expect(body.code.code).not.toBe(OLD_CODE);
    expect(body.code.code).toHaveLength(8);
  });

  it('carries the label across to the replacement', async () => {
    const res = await POST(makeRequest(), params);

    expect((await res.json()).code.label).toBe('corkboard flyer');
  });

  it('deactivates the old row', async () => {
    await POST(makeRequest(), params);

    expect(mockJoinCodeUpdate).toHaveBeenCalledWith({
      where: { id: CODE_ID },
      data: { isActive: false, rotatedAt: expect.any(Date) },
    });
  });

  it('404s on a code that is already rotated away', async () => {
    storedCode = { ...storedCode!, isActive: false };

    const res = await POST(makeRequest(), params);

    expect(res.status).toBe(404);
    expect(mockJoinCodeCreate).not.toHaveBeenCalled();
  });

  it('refuses a caller who cannot invite', async () => {
    mockGetUserCapabilities.mockResolvedValue({
      canInvite: false,
      reasons: { canInvite: 'NEEDS_PHOTO' },
    });

    const res = await POST(makeRequest(), params);

    expect(res.status).toBe(403);
    expect(mockJoinCodeCreate).not.toHaveBeenCalled();
    expect(mockJoinCodeUpdate).not.toHaveBeenCalled();
  });

  it('scopes the capability check to this library', async () => {
    await POST(makeRequest(), params);

    expect(mockGetUserCapabilities).toHaveBeenCalledWith(USER_ID, {
      libraryId: LIBRARY_ID,
    });
  });

  it('refuses an anonymous caller', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await POST(makeRequest(), params);

    expect(res.status).toBe(401);
    expect(mockGetUserCapabilities).not.toHaveBeenCalled();
  });

  it('refuses to rotate a code belonging to another library', async () => {
    // The codeId comes off the URL beside a libraryId the caller was gated
    // on. An admin of library A must not be able to rotate library B's
    // corkboard by naming its id here.
    storedCode = { ...storedCode!, collectionId: 'lib_elsewhere' };

    const res = await POST(makeRequest(), params);

    expect(res.status).toBe(404);
    expect(mockJoinCodeCreate).not.toHaveBeenCalled();
    expect(mockJoinCodeUpdate).not.toHaveBeenCalled();
  });
});

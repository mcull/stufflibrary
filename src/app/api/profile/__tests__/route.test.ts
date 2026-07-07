import { describe, it, expect, beforeEach, vi } from 'vitest';

import { TERMS_VERSION } from '@/lib/capabilities';

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockUserCreate = vi.hoisted(() => vi.fn());
const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockGetUserCapabilities = vi.hoisted(() => vi.fn());
const mockAddressFindUnique = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
      create: mockUserCreate,
    },
    address: {
      updateMany: vi.fn(),
      create: vi.fn(),
      findUnique: mockAddressFindUnique,
    },
    $transaction: async (fn: any) =>
      fn({
        address: {
          updateMany: vi.fn(),
          create: vi.fn().mockResolvedValue({ id: 'a1' }),
        },
        user: { update: mockUserUpdate },
      }),
  },
}));
vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/user-capabilities', () => ({
  getUserCapabilities: mockGetUserCapabilities,
}));

import { POST, GET } from '../route';

function req(body: unknown) {
  return new Request('http://t/api/profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({
    user: { id: 'u1', email: 'a@b.c' },
  });
  // findUnique is called once to locate the user, and again (with include)
  // for the full-path response. Return a usable shape both times.
  mockUserFindUnique.mockResolvedValue({ id: 'u1', addresses: [] });
  mockUserUpdate.mockResolvedValue({
    id: 'u1',
    name: 'Jo',
    email: 'a@b.c',
    onboardingStep: 'minimal',
  });
});

describe('POST /api/profile minimal mode', () => {
  it('mode=minimal sets onboardingStep=minimal and agreedToTermsAt, not profileCompleted', async () => {
    const res = await POST(
      req({ mode: 'minimal', name: 'Jo', agreedToTerms: true })
    );
    expect(res.status).toBe(200);
    const data = mockUserUpdate.mock.calls[0]![0].data;
    expect(data.onboardingStep).toBe('minimal');
    expect(data.agreedToTermsAt).toBeInstanceOf(Date);
    expect(data.agreedTermsVersion).toBe(TERMS_VERSION);
    expect(data.profileCompleted).toBeUndefined();
  });

  it('minimal mode rejects when terms not accepted (400)', async () => {
    const res = await POST(
      req({ mode: 'minimal', name: 'Jo', agreedToTerms: false })
    );
    expect(res.status).toBe(400);
  });
});

describe('POST /api/profile full mode persists terms', () => {
  it('full completion sets agreedToTermsAt and profileCompleted', async () => {
    const res = await POST(
      req({
        name: 'Jo',
        agreedToTerms: true,
        parsedAddress: {
          address1: '1 St',
          city: 'Town',
          state: 'CA',
          zip: '90001',
        },
      })
    );
    expect(res.status).toBe(200);
    const data = mockUserUpdate.mock.calls[0]![0].data;
    expect(data.profileCompleted).toBe(true);
    expect(data.agreedToTermsAt).toBeInstanceOf(Date);
    expect(data.agreedTermsVersion).toBe(TERMS_VERSION);
  });
});

describe('POST /api/profile full mode with an existing verified address', () => {
  it('accepts a submit without parsedAddress and keeps the current address', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      currentAddressId: 'addr1',
      addresses: [],
    });
    mockAddressFindUnique.mockResolvedValue({
      isActive: true,
      verificationMethod: 'google_places',
    });
    const res = await POST(req({ name: 'Jo', agreedToTerms: true }));
    expect(res.status).toBe(200);
    const data = mockUserUpdate.mock.calls[0]![0].data;
    expect(data.profileCompleted).toBe(true);
    // Must NOT overwrite the existing address pointer.
    expect('currentAddressId' in data).toBe(false);
  });

  it('still rejects (400) when there is no verified address to fall back on', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      currentAddressId: null,
      addresses: [],
    });
    const res = await POST(req({ name: 'Jo', agreedToTerms: true }));
    expect(res.status).toBe(400);
  });

  it('rejects (400) when the current address exists but is inactive', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      currentAddressId: 'addr1',
      addresses: [],
    });
    mockAddressFindUnique.mockResolvedValue({
      isActive: false,
      verificationMethod: 'google_places',
    });
    const res = await POST(req({ name: 'Jo', agreedToTerms: true }));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/profile', () => {
  it('returns a capabilities object', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u1', email: 'a@b.c' },
    });
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      name: 'Jo',
      agreedToTermsAt: new Date(),
    });
    mockGetUserCapabilities.mockResolvedValue({
      canEnter: true,
      canLend: false,
      canBorrow: false,
      canCreateLibrary: false,
      canInvite: false,
      concurrentBorrowLimit: 2,
      atBorrowLimit: false,
      reasons: {},
    });
    const res = await GET(new Request('http://t/api/profile') as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.capabilities).toBeDefined();
    expect(typeof json.capabilities.canBorrow).toBe('boolean');
    expect(mockGetUserCapabilities).toHaveBeenCalledWith('u1', undefined);
  });

  it('forwards ?libraryId as capability context', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u1', email: 'a@b.c' },
    });
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      name: 'Jo',
      agreedToTermsAt: new Date(),
    });
    mockGetUserCapabilities.mockResolvedValue({
      canEnter: true,
      canLend: false,
      canBorrow: false,
      canCreateLibrary: false,
      canInvite: true,
      concurrentBorrowLimit: 2,
      atBorrowLimit: false,
      reasons: {},
    });
    const res = await GET(
      new Request('http://t/api/profile?libraryId=lib1') as any
    );
    expect(res.status).toBe(200);
    expect(mockGetUserCapabilities).toHaveBeenCalledWith('u1', {
      libraryId: 'lib1',
    });
  });
});

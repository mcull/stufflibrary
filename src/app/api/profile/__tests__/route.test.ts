import { describe, it, expect, beforeEach, vi } from 'vitest';

import { TERMS_VERSION } from '@/lib/capabilities';

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockUserCreate = vi.hoisted(() => vi.fn());
const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockGetUserCapabilities = vi.hoisted(() => vi.fn());
const mockAddressFindUnique = vi.hoisted(() => vi.fn());
const mockAddressCreate = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ id: 'a1' })
);
const mockGeocodeAddress = vi.hoisted(() => vi.fn());
vi.mock('@/lib/geocode', () => ({ geocodeAddress: mockGeocodeAddress }));
const mockCheckSpendCap = vi.hoisted(() => vi.fn());
const mockRecordSpend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/spend-cap', () => ({
  checkSpendCap: mockCheckSpendCap,
  recordSpend: mockRecordSpend,
}));

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
          create: mockAddressCreate,
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

const mockUploadFile = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    url: 'https://blob.example/profiles/pic.jpg',
    pathname: 'profiles/pic.jpg',
  })
);
vi.mock('@/lib/storage', () => ({
  StorageService: {
    uploadFile: mockUploadFile,
    validateFileSize: vi.fn().mockReturnValue(true),
    validateFileType: vi.fn().mockReturnValue(true),
    generateUniqueFilename: vi.fn().mockReturnValue('profiles/pic.jpg'),
  },
}));

import { POST, GET, PUT } from '../route';

function req(body: unknown) {
  return new Request('http://t/api/profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAddressCreate.mockResolvedValue({ id: 'a1' });
  mockGeocodeAddress.mockResolvedValue(null);
  mockCheckSpendCap.mockResolvedValue({ allowed: true });
  mockRecordSpend.mockResolvedValue(undefined);
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

describe('POST /api/profile address coordinates', () => {
  const addressWithoutCoords = {
    address1: '1 St',
    city: 'Town',
    state: 'CA',
    zip: '90001',
  };

  it('does not geocode when the client already supplied coordinates', async () => {
    const res = await POST(
      req({
        name: 'Jo',
        agreedToTerms: true,
        parsedAddress: {
          ...addressWithoutCoords,
          latitude: 34.05,
          longitude: -118.24,
        },
      })
    );

    expect(res.status).toBe(200);
    expect(mockGeocodeAddress).not.toHaveBeenCalled();
    const created = mockAddressCreate.mock.calls[0]![0].data;
    expect(created.latitude).toBe(34.05);
    expect(created.longitude).toBe(-118.24);
  });

  it('geocodes server-side when coordinates are missing', async () => {
    mockGeocodeAddress.mockResolvedValue({
      latitude: 37.77,
      longitude: -122.42,
    });

    const res = await POST(
      req({
        name: 'Jo',
        agreedToTerms: true,
        parsedAddress: addressWithoutCoords,
      })
    );

    expect(res.status).toBe(200);
    expect(mockGeocodeAddress).toHaveBeenCalledWith('1 St, Town, CA, 90001');
    const created = mockAddressCreate.mock.calls[0]![0].data;
    expect(created.latitude).toBe(37.77);
    expect(created.longitude).toBe(-122.42);
  });

  it('records places spend for a successful geocode', async () => {
    mockGeocodeAddress.mockResolvedValue({
      latitude: 37.77,
      longitude: -122.42,
    });

    await POST(
      req({
        name: 'Jo',
        agreedToTerms: true,
        parsedAddress: addressWithoutCoords,
      })
    );

    expect(mockCheckSpendCap).toHaveBeenCalledWith('places');
    expect(mockRecordSpend).toHaveBeenCalledWith('places', 1);
  });

  it('does not record spend when the client supplied coordinates', async () => {
    await POST(
      req({
        name: 'Jo',
        agreedToTerms: true,
        parsedAddress: {
          ...addressWithoutCoords,
          latitude: 34.05,
          longitude: -118.24,
        },
      })
    );

    expect(mockCheckSpendCap).not.toHaveBeenCalled();
    expect(mockRecordSpend).not.toHaveBeenCalled();
  });

  it('skips the geocode but still saves when the spend cap is exceeded', async () => {
    mockCheckSpendCap.mockResolvedValue({
      allowed: false,
      reason: 'Daily spend cap reached. Please try again tomorrow.',
    });

    const res = await POST(
      req({
        name: 'Jo',
        agreedToTerms: true,
        parsedAddress: addressWithoutCoords,
      })
    );

    // The save must survive a blown cap — only the coordinates are missing.
    expect(res.status).toBe(200);
    expect(mockGeocodeAddress).not.toHaveBeenCalled();
    expect(mockRecordSpend).not.toHaveBeenCalled();
    const created = mockAddressCreate.mock.calls[0]![0].data;
    expect(created.latitude).toBeNull();
    expect(created.longitude).toBeNull();
  });

  it('does not record spend when geocoding fails', async () => {
    mockGeocodeAddress.mockResolvedValue(null);

    await POST(
      req({
        name: 'Jo',
        agreedToTerms: true,
        parsedAddress: addressWithoutCoords,
      })
    );

    expect(mockRecordSpend).not.toHaveBeenCalled();
  });

  it('still saves the address when geocoding fails', async () => {
    mockGeocodeAddress.mockResolvedValue(null);

    const res = await POST(
      req({
        name: 'Jo',
        agreedToTerms: true,
        parsedAddress: addressWithoutCoords,
      })
    );

    expect(res.status).toBe(200);
    const created = mockAddressCreate.mock.calls[0]![0].data;
    expect(created.latitude).toBeNull();
    expect(created.longitude).toBeNull();
  });
});

describe('PUT /api/profile address coordinates', () => {
  function putReq(body: unknown) {
    return new Request('http://t/api/profile', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }) as any;
  }

  it('does not geocode when the client already supplied coordinates', async () => {
    const res = await PUT(
      putReq({
        name: 'Jo',
        parsedAddress: {
          address1: '1 St',
          city: 'Town',
          state: 'CA',
          zip: '90001',
          latitude: 34.05,
          longitude: -118.24,
        },
      })
    );

    expect(res.status).toBe(200);
    expect(mockGeocodeAddress).not.toHaveBeenCalled();
    const created = mockAddressCreate.mock.calls[0]![0].data;
    expect(created.latitude).toBe(34.05);
  });

  it('geocodes server-side when coordinates are missing', async () => {
    mockGeocodeAddress.mockResolvedValue({
      latitude: 37.77,
      longitude: -122.42,
    });

    const res = await PUT(
      putReq({
        name: 'Jo',
        parsedAddress: {
          address1: '1 St',
          city: 'Town',
          state: 'CA',
          zip: '90001',
        },
      })
    );

    expect(res.status).toBe(200);
    expect(mockGeocodeAddress).toHaveBeenCalledWith('1 St, Town, CA, 90001');
    const created = mockAddressCreate.mock.calls[0]![0].data;
    expect(created.latitude).toBe(37.77);
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

describe('PUT /api/profile phone + SMS opt-in (#477)', () => {
  function putReq(body: unknown) {
    return new Request('http://t/api/profile', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }) as any;
  }

  beforeEach(() => {
    mockUserUpdate.mockResolvedValue({
      id: 'u1',
      name: 'Marc',
      email: 'a@b.c',
    });
  });

  it('persists a normalized phone and consent timestamp on opt-in', async () => {
    const res = await PUT(
      putReq({ name: 'Marc', phone: '(415) 555-2671', smsOptIn: true })
    );
    expect(res.status).toBe(200);
    const data = mockUserUpdate.mock.calls.at(-1)![0].data;
    expect(data.phone).toBe('+14155552671');
    expect(data.smsOptIn).toBe(true);
    expect(data.smsConsentAt).toBeInstanceOf(Date);
  });

  it('does not stamp consent when the box is unchecked', async () => {
    const res = await PUT(
      putReq({ name: 'Marc', phone: '4155552671', smsOptIn: false })
    );
    expect(res.status).toBe(200);
    const data = mockUserUpdate.mock.calls.at(-1)![0].data;
    expect(data.phone).toBe('+14155552671');
    expect(data.smsOptIn).toBe(false);
    expect(data.smsConsentAt).toBeUndefined();
  });

  it('rejects opt-in without a valid phone (400)', async () => {
    const res = await PUT(putReq({ name: 'Marc', smsOptIn: true }));
    expect(res.status).toBe(400);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('rejects an invalid phone (400)', async () => {
    const res = await PUT(putReq({ name: 'Marc', phone: '555-26' }));
    expect(res.status).toBe(400);
  });

  it('clearing the phone also clears the opt-in', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      phone: '+14155552671',
      addresses: [],
    });
    const res = await PUT(putReq({ name: 'Marc', phone: '', smsOptIn: true }));
    expect(res.status).toBe(200);
    const data = mockUserUpdate.mock.calls.at(-1)![0].data;
    expect(data.phone).toBeNull();
    expect(data.smsOptIn).toBe(false);
  });

  it('resets phoneVerified when the number changes', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      phone: '+14155550000',
      addresses: [],
    });
    const res = await PUT(
      putReq({ name: 'Marc', phone: '4155552671', smsOptIn: false })
    );
    expect(res.status).toBe(200);
    const data = mockUserUpdate.mock.calls.at(-1)![0].data;
    expect(data.phoneVerified).toBe(false);
  });

  it('leaves phone fields untouched when the request omits them', async () => {
    const res = await PUT(putReq({ name: 'Marc' }));
    expect(res.status).toBe(200);
    const data = mockUserUpdate.mock.calls.at(-1)![0].data;
    expect('phone' in data).toBe(false);
    expect('smsOptIn' in data).toBe(false);
  });
});

describe('PUT /api/profile with a new photo (#458)', () => {
  function formReq(withImage: boolean) {
    const fd = new FormData();
    fd.append('name', 'Marc');
    fd.append('bio', 'neighbor');
    fd.append('address', '1 Elm St');
    if (withImage) {
      fd.append(
        'profileImage',
        new File([new Uint8Array(64)], 'me.jpg', { type: 'image/jpeg' })
      );
    }
    return new Request('http://t/api/profile', {
      method: 'PUT',
      body: fd,
    }) as any;
  }

  it('uploads the photo to storage and saves its URL on the user', async () => {
    mockUserUpdate.mockResolvedValue({
      id: 'u1',
      name: 'Marc',
      email: 'a@b.c',
      addresses: [],
    });

    const res = await PUT(formReq(true));
    expect(res.status).toBe(200);

    expect(mockUploadFile).toHaveBeenCalledTimes(1);
    const updateArg = mockUserUpdate.mock.calls.at(-1)![0];
    expect(updateArg.data.image).toBe('https://blob.example/profiles/pic.jpg');
  });

  it('leaves the existing photo alone when no file is sent', async () => {
    mockUserUpdate.mockResolvedValue({
      id: 'u1',
      name: 'Marc',
      email: 'a@b.c',
      addresses: [],
    });

    const res = await PUT(formReq(false));
    expect(res.status).toBe(200);
    expect(mockUploadFile).not.toHaveBeenCalled();
    const updateArg = mockUserUpdate.mock.calls.at(-1)![0];
    expect(updateArg.data.image).toBeUndefined();
  });
});

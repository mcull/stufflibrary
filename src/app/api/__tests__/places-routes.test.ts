import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockCheckSpendCap = vi.hoisted(() => vi.fn());
const mockRecordSpend = vi.hoisted(() => vi.fn());
const mockFetch = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/spend-cap', () => ({
  checkSpendCap: mockCheckSpendCap,
  recordSpend: mockRecordSpend,
}));

function makeGetRequest(url: string) {
  return { nextUrl: new URL(url), headers: new Headers() } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', mockFetch);
  process.env.GOOGLE_PLACES_API_KEY = 'test-key';
  mockGetServerSession.mockResolvedValue({ user: { id: 'user_1' } });
  mockCheckSpendCap.mockResolvedValue({ allowed: true });
  mockRecordSpend.mockResolvedValue(undefined);
});

describe('GET /api/places/autocomplete', () => {
  const url = 'http://localhost/api/places/autocomplete?input=123 Main St';

  it('returns 401 when unauthenticated and does not call Google', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const { GET } = await import('../places/autocomplete/route');

    const response = await GET(makeGetRequest(url));

    expect(response.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns 429 when the daily spend cap is reached, before calling Google', async () => {
    mockCheckSpendCap.mockResolvedValue({
      allowed: false,
      reason: 'Daily spend cap reached.',
    });
    const { GET } = await import('../places/autocomplete/route');

    const response = await GET(makeGetRequest(url));

    expect(response.status).toBe(429);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns predictions and records places spend when allowed', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        places: [
          {
            id: 'place_1',
            displayName: { text: '123 Main St' },
            formattedAddress: '123 Main St, Springfield, US',
          },
        ],
      }),
    });
    const { GET } = await import('../places/autocomplete/route');

    const response = await GET(makeGetRequest(url));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.predictions).toHaveLength(1);
    expect(mockCheckSpendCap).toHaveBeenCalledWith('places');
    expect(mockRecordSpend).toHaveBeenCalledWith('places', expect.any(Number));
  });
});

describe('GET /api/places/details', () => {
  const url = 'http://localhost/api/places/details?place_id=place_1';

  it('returns 401 when unauthenticated and does not call Google', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const { GET } = await import('../places/details/route');

    const response = await GET(makeGetRequest(url));

    expect(response.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns 429 when the daily spend cap is reached, before calling Google', async () => {
    mockCheckSpendCap.mockResolvedValue({
      allowed: false,
      reason: 'Daily spend cap reached.',
    });
    const { GET } = await import('../places/details/route');

    const response = await GET(makeGetRequest(url));

    expect(response.status).toBe(429);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns parsed address and records places spend when allowed', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'place_1',
        formattedAddress: '123 Main St, Springfield, IL 62701, USA',
        addressComponents: [
          { types: ['street_number'], longText: '123', shortText: '123' },
          { types: ['route'], longText: 'Main St', shortText: 'Main St' },
          {
            types: ['locality'],
            longText: 'Springfield',
            shortText: 'Springfield',
          },
        ],
        location: { latitude: 39.78, longitude: -89.65 },
      }),
    });
    const { GET } = await import('../places/details/route');

    const response = await GET(makeGetRequest(url));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.address1).toBe('123 Main St');
    expect(mockCheckSpendCap).toHaveBeenCalledWith('places');
    expect(mockRecordSpend).toHaveBeenCalledWith('places', expect.any(Number));
  });
});

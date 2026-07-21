import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { geocodeAddress } from '../geocode';

const originalKey = process.env.GOOGLE_PLACES_API_KEY;

function okResponse(payload: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
  } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  process.env.GOOGLE_PLACES_API_KEY = 'test-key';
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (originalKey === undefined) {
    delete process.env.GOOGLE_PLACES_API_KEY;
  } else {
    process.env.GOOGLE_PLACES_API_KEY = originalKey;
  }
});

describe('geocodeAddress', () => {
  it('returns coordinates from a successful response', async () => {
    fetchMock.mockResolvedValue(
      okResponse({
        status: 'OK',
        results: [{ geometry: { location: { lat: 37.7749, lng: -122.4194 } } }],
      })
    );

    const result = await geocodeAddress('1 Market St, San Francisco, CA 94105');

    expect(result).toEqual({ latitude: 37.7749, longitude: -122.4194 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // The address and key must actually reach Google, url-encoded.
    const calledUrl = String(fetchMock.mock.calls[0]![0]);
    expect(calledUrl).toContain('maps.googleapis.com');
    expect(calledUrl).toContain(
      encodeURIComponent('1 Market St, San Francisco, CA 94105')
    );
    expect(calledUrl).toContain('key=test-key');
  });

  it('returns null (does not throw) on ZERO_RESULTS', async () => {
    fetchMock.mockResolvedValue(
      okResponse({ status: 'ZERO_RESULTS', results: [] })
    );

    await expect(
      geocodeAddress('nowhere at all, XX 00000')
    ).resolves.toBeNull();
  });

  it('returns null and logs an actionable message on REQUEST_DENIED', async () => {
    fetchMock.mockResolvedValue(
      okResponse({
        status: 'REQUEST_DENIED',
        error_message: 'This API project is not authorized to use this API.',
      })
    );

    const result = await geocodeAddress('1 Market St, San Francisco, CA');

    expect(result).toBeNull();
    const logged = (console.error as any).mock.calls
      .flat()
      .map(String)
      .join(' ');
    expect(logged).toContain('Geocoding API may not be enabled');
    expect(logged).toContain('GOOGLE_PLACES_API_KEY');
  });

  it('returns null (does not throw) when the network rejects', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNRESET'));

    await expect(
      geocodeAddress('1 Market St, San Francisco, CA')
    ).resolves.toBeNull();
  });

  it('returns null without attempting a fetch when the API key is missing', async () => {
    delete process.env.GOOGLE_PLACES_API_KEY;

    const result = await geocodeAddress('1 Market St, San Francisco, CA');

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null on a non-ok HTTP response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as unknown as Response);

    await expect(
      geocodeAddress('1 Market St, San Francisco, CA')
    ).resolves.toBeNull();
  });

  it('returns null on a malformed OK response missing coordinates', async () => {
    fetchMock.mockResolvedValue(
      okResponse({ status: 'OK', results: [{ geometry: {} }] })
    );

    await expect(
      geocodeAddress('1 Market St, San Francisco, CA')
    ).resolves.toBeNull();
  });

  it('returns null without a fetch for blank address text', async () => {
    const result = await geocodeAddress('   ');

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

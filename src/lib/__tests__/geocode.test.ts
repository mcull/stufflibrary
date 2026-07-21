import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { geocodeAddress, isBillableOutcome } from '../geocode';

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

    expect(result).toEqual({
      outcome: 'ok',
      coordinates: { latitude: 37.7749, longitude: -122.4194 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // The address and key must actually reach Google, url-encoded.
    const calledUrl = String(fetchMock.mock.calls[0]![0]);
    expect(calledUrl).toContain('maps.googleapis.com');
    expect(calledUrl).toContain(
      encodeURIComponent('1 Market St, San Francisco, CA 94105')
    );
    expect(calledUrl).toContain('key=test-key');
  });

  it('reports no_match (not a throw) on ZERO_RESULTS', async () => {
    fetchMock.mockResolvedValue(
      okResponse({ status: 'ZERO_RESULTS', results: [] })
    );

    const result = await geocodeAddress('nowhere at all, XX 00000');

    expect(result).toEqual({ outcome: 'no_match' });
  });

  it('reports failed and logs an actionable message on REQUEST_DENIED', async () => {
    fetchMock.mockResolvedValue(
      okResponse({
        status: 'REQUEST_DENIED',
        error_message: 'This API project is not authorized to use this API.',
      })
    );

    const result = await geocodeAddress('1 Market St, San Francisco, CA');

    expect(result.outcome).toBe('failed');
    const logged = (console.error as any).mock.calls
      .flat()
      .map(String)
      .join(' ');
    expect(logged).toContain('Geocoding API may not be enabled');
    expect(logged).toContain('GOOGLE_PLACES_API_KEY');
  });

  it('reports failed (does not throw) when the network rejects', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNRESET'));

    const result = await geocodeAddress('1 Market St, San Francisco, CA');

    expect(result.outcome).toBe('failed');
    if (result.outcome === 'failed') {
      expect(result.reason).toContain('network');
    }
  });

  it('reports failed without attempting a fetch when the API key is missing', async () => {
    delete process.env.GOOGLE_PLACES_API_KEY;

    const result = await geocodeAddress('1 Market St, San Francisco, CA');

    expect(result.outcome).toBe('failed');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports failed on a non-ok HTTP response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as unknown as Response);

    const result = await geocodeAddress('1 Market St, San Francisco, CA');

    expect(result.outcome).toBe('failed');
  });

  it('reports failed on a malformed OK response missing coordinates', async () => {
    fetchMock.mockResolvedValue(
      okResponse({ status: 'OK', results: [{ geometry: {} }] })
    );

    const result = await geocodeAddress('1 Market St, San Francisco, CA');

    expect(result.outcome).toBe('failed');
  });

  it('reports failed without a fetch for blank address text', async () => {
    const result = await geocodeAddress('   ');

    expect(result.outcome).toBe('failed');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('carries a reason on every failure so callers can log it', async () => {
    fetchMock.mockResolvedValue(okResponse({ status: 'OVER_QUERY_LIMIT' }));

    const result = await geocodeAddress('1 Market St, San Francisco, CA');

    expect(result.outcome).toBe('failed');
    if (result.outcome === 'failed') {
      expect(result.reason).toContain('OVER_QUERY_LIMIT');
    }
  });
});

describe('isBillableOutcome', () => {
  // Google charges for a request it actually answered. A match and a
  // searched-but-found-nothing both count; a rejected or never-sent request
  // does not.
  it('counts a successful lookup as billable', () => {
    expect(
      isBillableOutcome({
        outcome: 'ok',
        coordinates: { latitude: 1, longitude: 2 },
      })
    ).toBe(true);
  });

  it('counts no_match as billable — Google answered', () => {
    expect(isBillableOutcome({ outcome: 'no_match' })).toBe(true);
  });

  it('does not count a failure as billable', () => {
    expect(
      isBillableOutcome({ outcome: 'failed', reason: 'network error' })
    ).toBe(false);
  });
});

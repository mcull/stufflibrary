import { describe, it, expect } from 'vitest';

import { ingestRewrites } from '../rewrites.mjs';

describe('ingestRewrites (#422 — first-party PostHog proxy)', () => {
  const bySource = Object.fromEntries(ingestRewrites.map((r) => [r.source, r]));

  it('proxies static assets to the PostHog assets host', () => {
    expect(bySource['/ingest/static/:path*']).toMatchObject({
      destination: 'https://us-assets.i.posthog.com/static/:path*',
    });
  });

  it('proxies events to the PostHog ingest host', () => {
    expect(bySource['/ingest/:path*']).toMatchObject({
      destination: 'https://us.i.posthog.com/:path*',
    });
  });

  it('lists the static rule before the catch-all (order matters)', () => {
    expect(ingestRewrites[0]!.source).toBe('/ingest/static/:path*');
  });
});

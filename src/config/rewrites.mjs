// #422: first-party proxy for PostHog so ad blockers that eat
// us.i.posthog.com don't blind analytics. The client points api_host at
// /ingest; these rewrites pass it through server-side. Static rule must come
// before the catch-all. Plain .mjs consumed by next.config.mjs; tested.

/** @type {Array<{source: string, destination: string}>} */
export const ingestRewrites = [
  {
    source: '/ingest/static/:path*',
    destination: 'https://us-assets.i.posthog.com/static/:path*',
  },
  {
    source: '/ingest/:path*',
    destination: 'https://us.i.posthog.com/:path*',
  },
];

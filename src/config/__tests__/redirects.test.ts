import { describe, it, expect } from 'vitest';

import { legacyRedirects } from '../redirects.mjs';

describe('legacyRedirects (#399 URL consolidation)', () => {
  const bySource = Object.fromEntries(
    legacyRedirects.map((r) => [r.source, r])
  );

  it('sends /stacks home', () => {
    expect(bySource['/stacks']).toMatchObject({
      destination: '/home',
      permanent: true,
    });
  });

  it('sends old collection URLs (bookmarks, sent invite links) to /library', () => {
    expect(bySource['/collection/:path*']).toMatchObject({
      destination: '/library/:path*',
      permanent: true,
    });
  });

  it('sends the dead add-to-collection picker alias to add-to-library (#411)', () => {
    expect(bySource['/stuff/m/add-to-collection/:path*']).toMatchObject({
      destination: '/stuff/m/add-to-library/:path*',
      permanent: true,
    });
  });

  it('sends the even-older /branch alias to /library too', () => {
    expect(bySource['/branch/:path*']).toMatchObject({
      destination: '/library/:path*',
      permanent: true,
    });
  });

  it('every redirect is permanent — these URLs are gone for good', () => {
    for (const r of legacyRedirects) {
      expect(r.permanent, `${r.source} must be permanent`).toBe(true);
    }
  });
});

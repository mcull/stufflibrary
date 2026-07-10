import { describe, it, expect } from 'vitest';

import { SHOWCASE_ITEMS, showcaseItems } from '../homepage-watercolors';

describe('homepage watercolor showcase (#438)', () => {
  it('carries a healthy range of stuff', () => {
    expect(SHOWCASE_ITEMS.length).toBeGreaterThanOrEqual(40);
  });

  it('every item has a name and a pinned blob URL', () => {
    for (const item of SHOWCASE_ITEMS) {
      expect(item.name.length).toBeGreaterThan(0);
      expect(item.url).toMatch(
        /^https:\/\/.*\/homepage\/watercolors\/[a-z0-9-]+_600\.webp$/
      );
    }
  });

  it('excludes blocklisted slugs', () => {
    const slugs = SHOWCASE_ITEMS.map((i) => i.slug);
    for (const blocked of [
      'labyrinth',
      'qwirkle',
      'loppers',
      'extension-ladder',
      'heat-gun',
      'pressure-washer',
      'shop-vacuum',
      'tile-cutter',
      'obd-reader',
    ]) {
      expect(slugs).not.toContain(blocked);
    }
    expect(showcaseItems(['pasta-maker']).map((i) => i.slug)).not.toContain(
      'pasta-maker'
    );
  });

  it('has no duplicate slugs', () => {
    const slugs = SHOWCASE_ITEMS.map((i) => i.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

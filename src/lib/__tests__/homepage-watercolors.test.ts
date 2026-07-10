import { describe, it, expect } from 'vitest';

import { PARADE_ITEMS, paradeItems } from '../homepage-watercolors';

describe('homepage watercolor parade (#438)', () => {
  it('carries a healthy range of stuff', () => {
    expect(PARADE_ITEMS.length).toBeGreaterThanOrEqual(50);
  });

  it('every item has a name and a pinned blob URL', () => {
    for (const item of PARADE_ITEMS) {
      expect(item.name.length).toBeGreaterThan(0);
      expect(item.url).toMatch(
        /^https:\/\/.*\/homepage\/watercolors\/[a-z0-9-]+_600\.webp$/
      );
    }
  });

  it('excludes blocklisted slugs', () => {
    const slugs = PARADE_ITEMS.map((i) => i.slug);
    expect(slugs).not.toContain('labyrinth');
    expect(slugs).not.toContain('qwirkle');
    expect(paradeItems(['pasta-maker']).map((i) => i.slug)).not.toContain(
      'pasta-maker'
    );
  });

  it('has no duplicate slugs', () => {
    const slugs = PARADE_ITEMS.map((i) => i.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

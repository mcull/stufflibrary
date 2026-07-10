import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { SHOWCASE_ITEMS } from '@/lib/homepage-watercolors';

import { WatercolorShowcase } from '../WatercolorShowcase';

describe('WatercolorShowcase', () => {
  it('renders big watercolor images and nothing else — no captions, no owners', () => {
    const { container } = render(<WatercolorShowcase />);
    const imgs = container.querySelectorAll('img');
    expect(imgs.length).toBeGreaterThanOrEqual(3);
    for (const img of imgs) {
      expect(img.getAttribute('src')).toMatch(/homepage\/watercolors/);
    }
    // Images only: no visible text nodes anywhere in the showcase.
    expect(container.textContent).toBe('');
  });

  it('keeps alt text for screen readers', () => {
    render(<WatercolorShowcase />);
    const named = screen.getAllByRole('img', { name: /.+/ });
    expect(named.length).toBeGreaterThanOrEqual(3);
  });

  it('only shows items from the curated (blocklist-filtered) cast', () => {
    const { container } = render(<WatercolorShowcase />);
    const allowed = new Set(SHOWCASE_ITEMS.map((i) => i.url));
    for (const img of container.querySelectorAll('img')) {
      expect(allowed.has(img.getAttribute('src') ?? '')).toBe(true);
    }
  });
});

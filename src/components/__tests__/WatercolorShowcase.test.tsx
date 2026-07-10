import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

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

  describe('crossfade timing', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }));
    });
    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    // The bug Marc saw live: on fade-out the outgoing print flashed to its
    // NEXT preload item (ladder → ice cream maker) before the incoming one
    // (bundt pan) faded in. Mid-fade, a print's two layers must hold only
    // the outgoing and incoming items — the preload swap waits for the fade.
    it('never changes the outgoing image mid-fade', () => {
      const { container } = render(<WatercolorShowcase />);
      const printImgs = () =>
        Array.from(container.querySelectorAll('img'))
          .slice(0, 2)
          .map((img) => img.getAttribute('src'))
          .sort();

      // Print 0 shows item 0 and preloads item 3 (three prints stride by 3).
      const before = [SHOWCASE_ITEMS[0]!.url, SHOWCASE_ITEMS[3]!.url].sort();
      expect(printImgs()).toEqual(before);

      // Print 0's first swap fires at 4s. Mid-fade (t=4.1s) both layers must
      // be unchanged: item 0 fading out, item 3 fading in — no item 6 yet.
      act(() => vi.advanceTimersByTime(4100));
      expect(printImgs()).toEqual(before);

      // Once the fade settles, the now-hidden layer preloads item 6.
      act(() => vi.advanceTimersByTime(3000));
      expect(printImgs()).toEqual(
        [SHOWCASE_ITEMS[3]!.url, SHOWCASE_ITEMS[6]!.url].sort()
      );
    });
  });

  it('only shows items from the curated (blocklist-filtered) cast', () => {
    const { container } = render(<WatercolorShowcase />);
    const allowed = new Set(SHOWCASE_ITEMS.map((i) => i.url));
    for (const img of container.querySelectorAll('img')) {
      expect(allowed.has(img.getAttribute('src') ?? '')).toBe(true);
    }
  });
});

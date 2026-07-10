import { describe, it, expect } from 'vitest';

import { PROGRESS_TARGET_MS, simulatedProgress } from '../watercolor-progress';

describe('simulatedProgress (#433 — quiet bar instead of narration)', () => {
  it('starts at zero', () => {
    expect(simulatedProgress(0)).toBe(0);
  });

  it('fills linearly to 90% over the ~10s target', () => {
    expect(simulatedProgress(PROGRESS_TARGET_MS / 2)).toBeCloseTo(45, 0);
    expect(simulatedProgress(PROGRESS_TARGET_MS)).toBeCloseTo(90, 0);
  });

  it('creeps past the target but never fakes completion', () => {
    const atTarget = simulatedProgress(PROGRESS_TARGET_MS);
    const later = simulatedProgress(PROGRESS_TARGET_MS * 3);
    const muchLater = simulatedProgress(PROGRESS_TARGET_MS * 20);
    expect(later).toBeGreaterThan(atTarget);
    expect(muchLater).toBeGreaterThan(later);
    expect(muchLater).toBeLessThan(99);
  });

  it('is monotonic', () => {
    let prev = -1;
    for (let t = 0; t <= 60_000; t += 500) {
      const p = simulatedProgress(t);
      expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
    }
  });
});

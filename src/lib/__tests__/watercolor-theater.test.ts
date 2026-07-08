import { describe, it, expect } from 'vitest';

import {
  THEATER_LINES,
  THEATER_STEP_MS,
  theaterLine,
} from '../watercolor-theater';

describe('theaterLine (#423 — the illustration wait, narrated)', () => {
  it('opens with the first line', () => {
    expect(theaterLine(0)).toBe(THEATER_LINES[0]);
  });

  it('advances one line per step', () => {
    expect(theaterLine(THEATER_STEP_MS)).toBe(THEATER_LINES[1]);
    expect(theaterLine(THEATER_STEP_MS * 2 + 1)).toBe(THEATER_LINES[2]);
  });

  it('parks on the last line instead of looping (looping reads as broken)', () => {
    expect(theaterLine(THEATER_STEP_MS * 1000)).toBe(
      THEATER_LINES[THEATER_LINES.length - 1]
    );
  });

  it('covers the typical wait: enough lines to span at least 10 seconds', () => {
    expect(THEATER_LINES.length * THEATER_STEP_MS).toBeGreaterThanOrEqual(
      10_000
    );
  });
});

import { describe, it, expect } from 'vitest';

import { centerSquare, squareAroundBox } from '../image-prep';

describe('squareAroundBox (#468 subject-aware crop)', () => {
  it('centers the square on the subject with breathing room', () => {
    // A tall caulk gun occupying the left-middle of a portrait shot.
    const square = squareAroundBox({ x: 0.1, y: 0.2, w: 0.3, h: 0.5 })!;
    expect(square.size).toBeCloseTo(0.65); // 0.5 * 1.3 margin
    // Centered on the box center (0.25, 0.45), clamped in-frame.
    expect(square.x).toBeCloseTo(0);
    expect(square.y).toBeCloseTo(0.125);
  });

  it('clamps to the frame when the subject hugs an edge', () => {
    const square = squareAroundBox({ x: 0.7, y: 0.6, w: 0.3, h: 0.4 })!;
    expect(square.x + square.size).toBeLessThanOrEqual(1);
    expect(square.y + square.size).toBeLessThanOrEqual(1);
  });

  it('caps at the full frame for huge subjects', () => {
    const square = squareAroundBox({ x: 0, y: 0, w: 1, h: 1 })!;
    expect(square.size).toBe(1);
    expect(square.x).toBe(0);
    expect(square.y).toBe(0);
  });

  it('rejects degenerate boxes so callers fall back to center crop', () => {
    expect(squareAroundBox({ x: 0.2, y: 0.2, w: 0, h: 0.4 })).toBeNull();
    expect(squareAroundBox({ x: 0.9, y: 0.1, w: 0.5, h: 0.2 })).toBeNull();
    expect(squareAroundBox({ x: -0.1, y: 0.1, w: 0.3, h: 0.2 })).toBeNull();
  });
});

describe('centerSquare', () => {
  it('takes the largest centered square of a portrait frame', () => {
    // 3000x4000 portrait: square is 3000px, offset 500px down.
    const square = centerSquare(3000, 4000);
    expect(square.x).toBe(0);
    expect(square.y).toBeCloseTo(500 / 4000);
    expect(square.size).toBeCloseTo(3000 / 4000);
  });
});

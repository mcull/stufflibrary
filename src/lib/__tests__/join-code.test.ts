import { describe, it, expect } from 'vitest';

import {
  CROCKFORD_ALPHABET,
  JOIN_CODE_LENGTH,
  formatJoinCode,
  generateJoinCode,
  normalizeJoinCode,
} from '../join-code';

describe('generateJoinCode', () => {
  it('returns 8 characters by default', () => {
    expect(generateJoinCode()).toHaveLength(JOIN_CODE_LENGTH);
  });

  it('only ever emits alphabet characters', () => {
    for (let i = 0; i < 500; i++) {
      for (const ch of generateJoinCode()) {
        expect(CROCKFORD_ALPHABET).toContain(ch);
      }
    }
  });

  it('never emits I, L, O, or U', () => {
    for (let i = 0; i < 500; i++) {
      expect(generateJoinCode()).not.toMatch(/[ILOU]/);
    }
  });

  it('honours a longer length, so the space can grow later', () => {
    expect(generateJoinCode(10)).toHaveLength(10);
  });
});

describe('normalizeJoinCode', () => {
  it('uppercases and strips hyphens and spaces', () => {
    expect(normalizeJoinCode(' xkf7-2m9q ')).toBe('XKF72M9Q');
  });

  it('folds misread I and L to 1', () => {
    expect(normalizeJoinCode('IL345678')).toBe('11345678');
  });

  it('folds misread O to 0', () => {
    expect(normalizeJoinCode('OO345678')).toBe('00345678');
  });
});

describe('formatJoinCode', () => {
  it('hyphenates for display', () => {
    expect(formatJoinCode('XKF72M9Q')).toBe('XKF7-2M9Q');
  });
});

import { describe, it, expect } from 'vitest';

import {
  JOIN_CODE_LENGTH,
  formatJoinCode,
  generateJoinCode,
  normalizeJoinCode,
} from '../join-code';

// Written out by hand, not imported from CROCKFORD_ALPHABET — a test that
// checks a constant against itself can't fail no matter how the constant is
// corrupted.
const EXPECTED_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

describe('generateJoinCode', () => {
  it('returns 8 characters by default', () => {
    expect(generateJoinCode()).toHaveLength(JOIN_CODE_LENGTH);
  });

  it('only ever emits alphabet characters', () => {
    for (let i = 0; i < 500; i++) {
      for (const ch of generateJoinCode()) {
        expect(EXPECTED_ALPHABET).toContain(ch);
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

  it('covers the full 32-symbol alphabet, not a shrunken subset', () => {
    // 500 codes * 8 chars = 4000 draws. Every one of the 32 symbols should
    // turn up with overwhelming probability. This is what catches a mutant
    // like `byte % 16` (halves the keyspace) or `byte % 31` (drops Z and
    // reintroduces modulo bias) that the alphabet-membership test above
    // cannot see, because a shrunken subset is still a subset.
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      for (const ch of generateJoinCode()) {
        seen.add(ch);
      }
    }
    expect(seen.size).toBe(32);
  });

  it('rejects a forbidden draw and retries, given an injected byte source', () => {
    // First call's bytes decode (byte % 32) to "A55A55A5", which contains
    // the forbidden substring "A55". Second call's bytes decode to
    // "00000000", which is clean. The generator must discard the first and
    // return the second — proving the rejection loop actually runs, not
    // just a predicate lifted out for convenience.
    const buffers = [
      Buffer.from([10, 5, 5, 10, 5, 5, 10, 5]),
      Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
    ];
    let calls = 0;
    const fakeRandomBytes = (size: number): Buffer => {
      const buf = buffers[calls++];
      if (!buf) throw new Error('fakeRandomBytes exhausted');
      expect(buf).toHaveLength(size);
      return buf;
    };

    const result = generateJoinCode(8, fakeRandomBytes);

    expect(result).toBe('00000000');
    expect(calls).toBe(2);
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

  it('is a no-op on any code generateJoinCode can actually produce', () => {
    // The alphabet excludes I, L and O, so normalizing a generated code
    // should never change it. This holds today only because the alphabet
    // and the fold rules happen to be disjoint — exactly the invariant
    // someone breaks by adding a character to the alphabet later, which
    // would silently break every code lookup in the system.
    for (let i = 0; i < 200; i++) {
      const code = generateJoinCode();
      expect(normalizeJoinCode(code)).toBe(code);
    }
  });
});

describe('formatJoinCode', () => {
  it('hyphenates for display', () => {
    expect(formatJoinCode('XKF72M9Q')).toBe('XKF7-2M9Q');
  });

  it('leaves codes shorter than 2 characters unchanged', () => {
    expect(formatJoinCode('')).toBe('');
    expect(formatJoinCode('X')).toBe('X');
  });
});

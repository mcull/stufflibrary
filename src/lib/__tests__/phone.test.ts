import { describe, it, expect } from 'vitest';

import { normalizeUsPhone } from '../phone';

describe('normalizeUsPhone', () => {
  it('normalizes a bare 10-digit number to E.164', () => {
    expect(normalizeUsPhone('4155552671')).toBe('+14155552671');
  });

  it('normalizes common US formatting', () => {
    expect(normalizeUsPhone('(415) 555-2671')).toBe('+14155552671');
    expect(normalizeUsPhone('415-555-2671')).toBe('+14155552671');
    expect(normalizeUsPhone('415.555.2671')).toBe('+14155552671');
  });

  it('accepts an existing +1 or 1 prefix', () => {
    expect(normalizeUsPhone('+1 415 555 2671')).toBe('+14155552671');
    expect(normalizeUsPhone('14155552671')).toBe('+14155552671');
  });

  it('rejects numbers that are too short or too long', () => {
    expect(normalizeUsPhone('555-2671')).toBeNull();
    expect(normalizeUsPhone('4155552671000')).toBeNull();
  });

  it('rejects area codes and exchanges that cannot start with 0/1', () => {
    expect(normalizeUsPhone('0155552671')).toBeNull();
    expect(normalizeUsPhone('4151552671')).toBeNull();
  });

  it('rejects junk and empty input', () => {
    expect(normalizeUsPhone('')).toBeNull();
    expect(normalizeUsPhone('not a phone')).toBeNull();
  });
});

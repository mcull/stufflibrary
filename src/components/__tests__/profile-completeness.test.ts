import { describe, it, expect } from 'vitest';

import {
  profileCardStatus,
  completedCardCount,
} from '../profile-wizard/completeness';

describe('profileCardStatus', () => {
  it('returns the three card parts in fill-in order', () => {
    const items = profileCardStatus({
      hasBasics: true,
      hasPhoto: false,
      hasAddress: false,
    });
    expect(items.map((i) => i.key)).toEqual(['basics', 'photo', 'address']);
  });

  it('reflects the done flags', () => {
    const items = profileCardStatus({
      hasBasics: true,
      hasPhoto: true,
      hasAddress: false,
    });
    expect(items.find((i) => i.key === 'photo')?.done).toBe(true);
    expect(items.find((i) => i.key === 'address')?.done).toBe(false);
  });

  it('counts completed parts', () => {
    expect(
      completedCardCount(
        profileCardStatus({
          hasBasics: true,
          hasPhoto: true,
          hasAddress: false,
        })
      )
    ).toBe(2);
  });
});

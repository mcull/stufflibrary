import { describe, it, expect } from 'vitest';

import { canSubmitMinimal } from '../profile-wizard/minimalEntry';

describe('canSubmitMinimal', () => {
  it('true with a name and all required agreements', () => {
    expect(
      canSubmitMinimal({
        name: 'Jo',
        agreedToHouseholdGoods: true,
        agreedToTrustAndCare: true,
        agreedToCommunityValues: true,
        agreedToAgeRestrictions: true,
        agreedToTerms: true,
      })
    ).toBe(true);
  });
  it('false when any agreement is unchecked', () => {
    expect(
      canSubmitMinimal({
        name: 'Jo',
        agreedToHouseholdGoods: true,
        agreedToTrustAndCare: true,
        agreedToCommunityValues: true,
        agreedToAgeRestrictions: true,
        agreedToTerms: false,
      })
    ).toBe(false);
  });
  it('false when name is blank', () => {
    expect(
      canSubmitMinimal({
        name: '  ',
        agreedToHouseholdGoods: true,
        agreedToTrustAndCare: true,
        agreedToCommunityValues: true,
        agreedToAgeRestrictions: true,
        agreedToTerms: true,
      })
    ).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';

import { canSubmitMinimal } from '../profile-wizard/minimalEntry';

describe('canSubmitMinimal', () => {
  it('true with a name and the signed promise', () => {
    expect(
      canSubmitMinimal({
        name: 'Jo',
        agreedToTerms: true,
      })
    ).toBe(true);
  });
  it('false when the promise is unchecked', () => {
    expect(
      canSubmitMinimal({
        name: 'Jo',
        agreedToTerms: false,
      })
    ).toBe(false);
  });
  it('false when name is blank', () => {
    expect(
      canSubmitMinimal({
        name: '  ',
        agreedToTerms: true,
      })
    ).toBe(false);
  });
});

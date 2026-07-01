import { describe, it, expect } from 'vitest';

import { profileSubmitBlockMessage } from '../ProfileWizard';

describe('profileSubmitBlockMessage', () => {
  it('points at the photo when profilePicture is missing', () => {
    expect(
      profileSubmitBlockMessage({
        profilePicture: { type: 'required', message: 'x' },
      })
    ).toMatch(/photo/i);
  });

  it('points at the address when it is not verified', () => {
    expect(
      profileSubmitBlockMessage({ address: { type: 'required', message: 'x' } })
    ).toMatch(/address/i);
  });

  it('points at the agreements when one is unchecked', () => {
    expect(
      profileSubmitBlockMessage({
        agreedToTerms: { type: 'required', message: 'x' },
      })
    ).toMatch(/agreement/i);
  });

  it('never returns an empty string, even with no known field', () => {
    expect(profileSubmitBlockMessage({}).length).toBeGreaterThan(0);
  });
});

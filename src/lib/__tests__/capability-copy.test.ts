import { describe, it, expect } from 'vitest';

import { capabilityCopy } from '../capability-copy';

describe('capabilityCopy', () => {
  it('covers every reason with a non-empty CTA', () => {
    const reasons = [
      'NEEDS_NAME',
      'NEEDS_TERMS',
      'NEEDS_PHOTO',
      'NEEDS_ADDRESS',
      'NEEDS_TRUST_TIER',
      'AT_BORROW_LIMIT',
    ] as const;
    for (const r of reasons) {
      const c = capabilityCopy(r);
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.cta.length).toBeGreaterThan(0);
    }
  });
  it('routes profile reasons to /profile/create and the trust reason has no profile CTA href', () => {
    expect(capabilityCopy('NEEDS_PHOTO').href).toContain('/profile/create');
    expect(capabilityCopy('NEEDS_TRUST_TIER').href).toBeUndefined();
  });
});

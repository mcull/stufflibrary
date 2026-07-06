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

  it('photo prompt names only the photo when the address is already verified', () => {
    const c = capabilityCopy('NEEDS_PHOTO', ['NEEDS_PHOTO']);
    expect(c.body.toLowerCase()).not.toContain('address');
    expect(c.href).toContain('field=photo');
  });

  it('photo prompt names the whole ask when the address is also missing', () => {
    const c = capabilityCopy('NEEDS_PHOTO', ['NEEDS_PHOTO', 'NEEDS_ADDRESS']);
    expect(c.body.toLowerCase()).toContain('address');
  });

  it('photo prompt without a missing set stays conservative (whole ask)', () => {
    expect(capabilityCopy('NEEDS_PHOTO').body.toLowerCase()).toContain(
      'address'
    );
  });

  it('address prompt never hedges about a photo (reason order guarantees one)', () => {
    const c = capabilityCopy('NEEDS_ADDRESS', ['NEEDS_ADDRESS']);
    expect(c.body.toLowerCase()).not.toContain('photo');
    expect(c.href).toContain('field=address');
  });
});

import { describe, it, expect } from 'vitest';

import {
  getCapabilities,
  hasMinimalProfile,
  CONCURRENT_BORROW_LIMITS,
  type CapabilityFacts,
} from '../capabilities';

const full: CapabilityFacts = {
  hasName: true,
  hasAcceptedTerms: true,
  hasPhoto: true,
  hasVerifiedAddress: true,
  trustTier: 'NEW',
  openBorrowCount: 0,
  isLibraryOwnerOrAdmin: false,
};

describe('getCapabilities — completeness axis', () => {
  it('minimal profile (name + terms) can enter but cannot lend/borrow/create', () => {
    const c = getCapabilities({
      ...full,
      hasPhoto: false,
      hasVerifiedAddress: false,
    });
    expect(c.canEnter).toBe(true);
    expect(c.canLend).toBe(false);
    expect(c.canBorrow).toBe(false);
    expect(c.canCreateLibrary).toBe(false);
    expect(c.reasons.canLend).toBe('NEEDS_PHOTO');
    expect(c.reasons.canCreateLibrary).toBe('NEEDS_PHOTO');
  });

  it('missing name (with terms) reports NEEDS_NAME', () => {
    const c = getCapabilities({ ...full, hasName: false });
    expect(c.reasons.canLend).toBe('NEEDS_NAME');
  });

  it('missing terms blocks entry and reports NEEDS_TERMS', () => {
    const c = getCapabilities({ ...full, hasAcceptedTerms: false });
    expect(c.canEnter).toBe(false);
    expect(c.reasons.canBorrow).toBe('NEEDS_TERMS');
  });

  it('photo present but address missing reports NEEDS_ADDRESS', () => {
    const c = getCapabilities({ ...full, hasVerifiedAddress: false });
    expect(c.canLend).toBe(false);
    expect(c.reasons.canLend).toBe('NEEDS_ADDRESS');
  });

  it('full profile unlocks lend, borrow, and create-library', () => {
    const c = getCapabilities(full);
    expect(c.canLend).toBe(true);
    expect(c.canBorrow).toBe(true);
    expect(c.canCreateLibrary).toBe(true);
    expect(c.reasons.canLend).toBeUndefined();
  });
});

describe('getCapabilities — trust axis', () => {
  it('per-tier concurrent borrow limits', () => {
    expect(
      getCapabilities({ ...full, trustTier: 'NEW' }).concurrentBorrowLimit
    ).toBe(2);
    expect(
      getCapabilities({ ...full, trustTier: 'BUILDING' }).concurrentBorrowLimit
    ).toBe(4);
    expect(
      getCapabilities({ ...full, trustTier: 'TRUSTED' }).concurrentBorrowLimit
    ).toBe(8);
    expect(
      getCapabilities({ ...full, trustTier: 'HIGHLY_TRUSTED' })
        .concurrentBorrowLimit
    ).toBe(20);
  });

  it('null tier is treated as NEW', () => {
    expect(
      getCapabilities({ ...full, trustTier: null }).concurrentBorrowLimit
    ).toBe(2);
  });

  it('at the borrow limit, canBorrow is false with AT_BORROW_LIMIT', () => {
    const c = getCapabilities({
      ...full,
      trustTier: 'NEW',
      openBorrowCount: 2,
    });
    expect(c.atBorrowLimit).toBe(true);
    expect(c.canBorrow).toBe(false);
    expect(c.reasons.canBorrow).toBe('AT_BORROW_LIMIT');
  });

  it('below the limit, a full-profile NEW user can borrow', () => {
    const c = getCapabilities({
      ...full,
      trustTier: 'NEW',
      openBorrowCount: 1,
    });
    expect(c.canBorrow).toBe(true);
  });

  it('non-owner member below TRUSTED cannot invite', () => {
    const c = getCapabilities({
      ...full,
      trustTier: 'BUILDING',
      isLibraryOwnerOrAdmin: false,
    });
    expect(c.canInvite).toBe(false);
    expect(c.reasons.canInvite).toBe('NEEDS_TRUST_TIER');
  });

  it('TRUSTED member can invite', () => {
    expect(getCapabilities({ ...full, trustTier: 'TRUSTED' }).canInvite).toBe(
      true
    );
    expect(
      getCapabilities({ ...full, trustTier: 'HIGHLY_TRUSTED' }).canInvite
    ).toBe(true);
  });

  it('library owner/admin can invite regardless of tier', () => {
    const c = getCapabilities({
      ...full,
      trustTier: 'NEW',
      isLibraryOwnerOrAdmin: true,
    });
    expect(c.canInvite).toBe(true);
    expect(c.reasons.canInvite).toBeUndefined();
  });
});

describe('hasMinimalProfile', () => {
  it('true when name + terms present', () => {
    expect(hasMinimalProfile({ name: 'A', agreedToTermsAt: new Date() })).toBe(
      true
    );
  });
  it('false when name missing', () => {
    expect(hasMinimalProfile({ name: null, agreedToTermsAt: new Date() })).toBe(
      false
    );
  });
  it('false when terms not accepted', () => {
    expect(hasMinimalProfile({ name: 'A', agreedToTermsAt: null })).toBe(false);
  });
});

describe('CONCURRENT_BORROW_LIMITS is the tunable source of truth', () => {
  it('exposes a limit for every tier', () => {
    expect(Object.keys(CONCURRENT_BORROW_LIMITS).sort()).toEqual([
      'BUILDING',
      'HIGHLY_TRUSTED',
      'NEW',
      'TRUSTED',
    ]);
  });
});

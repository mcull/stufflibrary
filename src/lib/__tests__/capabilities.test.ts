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

describe('getCapabilities — missingProfileFacts', () => {
  it('empty for a full profile', () => {
    expect(getCapabilities(full).missingProfileFacts).toEqual([]);
  });
  it('lists photo and address when both are missing, in fill-in order', () => {
    const c = getCapabilities({
      ...full,
      hasPhoto: false,
      hasVerifiedAddress: false,
    });
    expect(c.missingProfileFacts).toEqual(['NEEDS_PHOTO', 'NEEDS_ADDRESS']);
  });
  it('lists only the address when the photo is already set', () => {
    const c = getCapabilities({ ...full, hasVerifiedAddress: false });
    expect(c.missingProfileFacts).toEqual(['NEEDS_ADDRESS']);
  });
  it('includes terms and name gaps first', () => {
    const c = getCapabilities({
      ...full,
      hasName: false,
      hasAcceptedTerms: false,
      hasPhoto: false,
      hasVerifiedAddress: false,
    });
    expect(c.missingProfileFacts).toEqual([
      'NEEDS_TERMS',
      'NEEDS_NAME',
      'NEEDS_PHOTO',
      'NEEDS_ADDRESS',
    ]);
  });
});

describe('getCapabilities — completeness axis', () => {
  it('minimal profile (name + terms) can enter, create a library, and add items — but not borrow', () => {
    const c = getCapabilities({
      ...full,
      hasPhoto: false,
      hasVerifiedAddress: false,
    });
    expect(c.canEnter).toBe(true);
    // Solo setup is allowed with just minimal.
    expect(c.canCreateLibrary).toBe(true);
    expect(c.canLend).toBe(true);
    expect(c.reasons.canCreateLibrary).toBeUndefined();
    expect(c.reasons.canLend).toBeUndefined();
    // Transactions still require a full profile.
    expect(c.canBorrow).toBe(false);
    expect(c.reasons.canBorrow).toBe('NEEDS_PHOTO');
  });

  it('missing name (with terms) blocks create/lend with NEEDS_NAME', () => {
    const c = getCapabilities({ ...full, hasName: false });
    expect(c.canCreateLibrary).toBe(false);
    expect(c.canLend).toBe(false);
    expect(c.reasons.canLend).toBe('NEEDS_NAME');
  });

  it('missing terms blocks entry and reports NEEDS_TERMS', () => {
    const c = getCapabilities({ ...full, hasAcceptedTerms: false });
    expect(c.canEnter).toBe(false);
    expect(c.reasons.canBorrow).toBe('NEEDS_TERMS');
  });

  it('photo present but address missing: can still create/lend, but borrow needs the address', () => {
    const c = getCapabilities({ ...full, hasVerifiedAddress: false });
    expect(c.canCreateLibrary).toBe(true);
    expect(c.canLend).toBe(true);
    expect(c.canBorrow).toBe(false);
    expect(c.reasons.canBorrow).toBe('NEEDS_ADDRESS');
  });

  it('full profile unlocks borrow (create/lend already allowed at minimal)', () => {
    const c = getCapabilities(full);
    expect(c.canLend).toBe(true);
    expect(c.canBorrow).toBe(true);
    expect(c.canCreateLibrary).toBe(true);
    expect(c.reasons.canBorrow).toBeUndefined();
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

  it('non-owner member below TRUSTED cannot invite (tier reason)', () => {
    const c = getCapabilities({
      ...full,
      trustTier: 'BUILDING',
      isLibraryOwnerOrAdmin: false,
    });
    expect(c.canInvite).toBe(false);
    expect(c.reasons.canInvite).toBe('NEEDS_TRUST_TIER');
  });

  it('a minimal-profile owner cannot invite until the profile is full', () => {
    const c = getCapabilities({
      ...full,
      hasPhoto: false,
      hasVerifiedAddress: false,
      isLibraryOwnerOrAdmin: true,
    });
    expect(c.canInvite).toBe(false);
    // Completeness reason, not tier — inviting is the moment we ask for the
    // full profile (photo + address).
    expect(c.reasons.canInvite).toBe('NEEDS_PHOTO');
  });

  it('invite reason reflects missing terms, not tier, when not yet minimal', () => {
    const c = getCapabilities({
      ...full,
      hasAcceptedTerms: false,
      isLibraryOwnerOrAdmin: true,
    });
    expect(c.canInvite).toBe(false);
    expect(c.reasons.canInvite).toBe('NEEDS_TERMS');
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

import type { TrustTier } from './trust-score';

/** Bump when the terms-of-service text changes so users re-accept. */
export const TERMS_VERSION = '2026-06-28';

/** Tunable: max simultaneous open borrows per trust tier. */
export const CONCURRENT_BORROW_LIMITS: Record<TrustTier, number> = {
  NEW: 2,
  BUILDING: 4,
  TRUSTED: 8,
  HIGHLY_TRUSTED: 20,
};

/** Minimum trust tier a non-owner member needs to invite others. */
export const MIN_TIER_TO_INVITE: TrustTier = 'TRUSTED';

const TIER_RANK: Record<TrustTier, number> = {
  NEW: 0,
  BUILDING: 1,
  TRUSTED: 2,
  HIGHLY_TRUSTED: 3,
};

export type CapabilityReason =
  | 'NEEDS_NAME'
  | 'NEEDS_TERMS'
  | 'NEEDS_PHOTO'
  | 'NEEDS_ADDRESS'
  | 'NEEDS_TRUST_TIER'
  | 'AT_BORROW_LIMIT';

export interface CapabilityFacts {
  hasName: boolean;
  hasAcceptedTerms: boolean;
  hasPhoto: boolean;
  hasVerifiedAddress: boolean;
  trustTier: TrustTier | null;
  openBorrowCount: number;
  isLibraryOwnerOrAdmin: boolean;
}

type GatedCapability =
  | 'canLend'
  | 'canBorrow'
  | 'canCreateLibrary'
  | 'canInvite';

export interface Capabilities {
  canEnter: boolean;
  canLend: boolean;
  canBorrow: boolean;
  canCreateLibrary: boolean;
  canInvite: boolean;
  concurrentBorrowLimit: number;
  atBorrowLimit: boolean;
  reasons: Partial<Record<GatedCapability, CapabilityReason>>;
}

/** First missing completeness signal, or undefined if the profile is full. */
function completenessReason(f: CapabilityFacts): CapabilityReason | undefined {
  if (!f.hasAcceptedTerms) return 'NEEDS_TERMS';
  if (!f.hasName) return 'NEEDS_NAME';
  if (!f.hasPhoto) return 'NEEDS_PHOTO';
  if (!f.hasVerifiedAddress) return 'NEEDS_ADDRESS';
  return undefined;
}

export function getCapabilities(f: CapabilityFacts): Capabilities {
  const effectiveTier: TrustTier = f.trustTier ?? 'NEW';
  const concurrentBorrowLimit = CONCURRENT_BORROW_LIMITS[effectiveTier];
  const atBorrowLimit = f.openBorrowCount >= concurrentBorrowLimit;

  const canEnter = f.hasName && f.hasAcceptedTerms;
  const incomplete = completenessReason(f);
  const isFull = incomplete === undefined;

  // Solo setup (create a library, add your own items) only needs minimal
  // entry — you're building your own space. The full profile (photo + verified
  // address) is required at the social/trust moments: inviting a neighbor and
  // borrowing/lending in a real transaction.
  const canLend = canEnter;
  const canCreateLibrary = canEnter;
  const canBorrow = isFull && !atBorrowLimit;
  const canInvite =
    isFull &&
    (f.isLibraryOwnerOrAdmin ||
      TIER_RANK[effectiveTier] >= TIER_RANK[MIN_TIER_TO_INVITE]);

  const reasons: Partial<Record<GatedCapability, CapabilityReason>> = {};
  if (!canLend && incomplete) reasons.canLend = incomplete;
  if (!canCreateLibrary && incomplete) reasons.canCreateLibrary = incomplete;
  if (!canBorrow) reasons.canBorrow = incomplete ?? 'AT_BORROW_LIMIT';
  if (!canInvite)
    // Not full yet → ask for the profile; full but low tier → tier gate.
    reasons.canInvite = isFull
      ? 'NEEDS_TRUST_TIER'
      : (incomplete ?? 'NEEDS_TERMS');

  return {
    canEnter,
    canLend,
    canBorrow,
    canCreateLibrary,
    canInvite,
    concurrentBorrowLimit,
    atBorrowLimit,
    reasons,
  };
}

/** Has the user done the minimal step (name + accepted terms)? */
export function hasMinimalProfile(u: {
  name: string | null;
  agreedToTermsAt: Date | null;
}): boolean {
  return Boolean(u.name && u.name.trim() && u.agreedToTermsAt);
}

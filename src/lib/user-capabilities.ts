import {
  getCapabilities,
  type Capabilities,
  type CapabilityFacts,
} from './capabilities';
import { db } from './db';
import type { TrustTier } from './trust-score';

/** BorrowRequest statuses that count as an "open" borrow for the cap. */
export const OPEN_BORROW_STATUSES = [
  'PENDING',
  'APPROVED',
  'ACTIVE',
  'RETURN_PENDING',
] as const;

const EMPTY_FACTS: CapabilityFacts = {
  hasName: false,
  hasAcceptedTerms: false,
  hasPhoto: false,
  hasVerifiedAddress: false,
  trustTier: null,
  openBorrowCount: 0,
  isLibraryOwnerOrAdmin: false,
};

export async function getUserCapabilities(
  userId: string,
  ctx?: { libraryId?: string }
): Promise<Capabilities> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      image: true,
      agreedToTermsAt: true,
      currentAddressId: true,
      trustTier: true,
    },
  });

  if (!user) return getCapabilities(EMPTY_FACTS);

  let hasVerifiedAddress = false;
  if (user.currentAddressId) {
    const addr = await db.address.findUnique({
      where: { id: user.currentAddressId },
      select: { isActive: true, verificationMethod: true },
    });
    hasVerifiedAddress = Boolean(addr?.isActive && addr.verificationMethod);
  }

  const openBorrowCount = await db.borrowRequest.count({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: { borrowerId: userId, status: { in: OPEN_BORROW_STATUSES as any } },
  });

  let isLibraryOwnerOrAdmin = false;
  if (ctx?.libraryId) {
    const owned = await db.collection.findFirst({
      where: {
        id: ctx.libraryId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId, role: 'admin', isActive: true } } },
        ],
      },
      select: { id: true },
    });
    isLibraryOwnerOrAdmin = Boolean(owned);
  }

  return getCapabilities({
    hasName: Boolean(user.name && user.name.trim()),
    hasAcceptedTerms: Boolean(user.agreedToTermsAt),
    hasPhoto: Boolean(user.image),
    hasVerifiedAddress,
    trustTier: (user.trustTier as TrustTier | null) ?? null,
    openBorrowCount,
    isLibraryOwnerOrAdmin,
  });
}

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockAddressFindUnique = vi.hoisted(() => vi.fn());
const mockBorrowCount = vi.hoisted(() => vi.fn());
const mockCollectionFindFirst = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: mockUserFindUnique },
    address: { findUnique: mockAddressFindUnique },
    borrowRequest: { count: mockBorrowCount },
    collection: { findFirst: mockCollectionFindFirst },
  },
}));

import {
  getUserCapabilities,
  OPEN_BORROW_STATUSES,
} from '../user-capabilities';

beforeEach(() => {
  vi.clearAllMocks();
  mockUserFindUnique.mockResolvedValue({
    name: 'Jo',
    image: 'https://img/x.png',
    agreedToTermsAt: new Date(),
    currentAddressId: 'addr1',
    trustTier: 'NEW',
  });
  mockAddressFindUnique.mockResolvedValue({
    isActive: true,
    verificationMethod: 'google_places',
  });
  mockBorrowCount.mockResolvedValue(0);
  mockCollectionFindFirst.mockResolvedValue(null);
});

describe('getUserCapabilities', () => {
  it('derives a full-profile NEW user who can lend and borrow', async () => {
    const c = await getUserCapabilities('u1');
    expect(c.canLend).toBe(true);
    expect(c.canBorrow).toBe(true);
    expect(c.concurrentBorrowLimit).toBe(2);
  });

  it('counts only open borrow statuses', async () => {
    await getUserCapabilities('u1');
    expect(mockBorrowCount).toHaveBeenCalledWith({
      where: { borrowerId: 'u1', status: { in: OPEN_BORROW_STATUSES } },
    });
  });

  it('an unverified address means not full profile (blocks borrow)', async () => {
    mockAddressFindUnique.mockResolvedValue({
      isActive: true,
      verificationMethod: null,
    });
    const c = await getUserCapabilities('u1');
    // Creating/lending is allowed at minimal; borrowing needs the full profile.
    expect(c.canBorrow).toBe(false);
    expect(c.reasons.canBorrow).toBe('NEEDS_ADDRESS');
  });

  it('an inactive address means not full profile (blocks borrow)', async () => {
    mockAddressFindUnique.mockResolvedValue({
      isActive: false,
      verificationMethod: 'google_places',
    });
    const c = await getUserCapabilities('u1');
    expect(c.canBorrow).toBe(false);
    expect(c.reasons.canBorrow).toBe('NEEDS_ADDRESS');
  });

  it('missing currentAddressId means not full profile', async () => {
    mockUserFindUnique.mockResolvedValue({
      name: 'Jo',
      image: 'x',
      agreedToTermsAt: new Date(),
      currentAddressId: null,
      trustTier: 'NEW',
    });
    const c = await getUserCapabilities('u1');
    expect(c.canBorrow).toBe(false);
    expect(mockAddressFindUnique).not.toHaveBeenCalled();
  });

  it('at the NEW borrow cap, canBorrow is false', async () => {
    mockBorrowCount.mockResolvedValue(2);
    const c = await getUserCapabilities('u1');
    expect(c.atBorrowLimit).toBe(true);
    expect(c.canBorrow).toBe(false);
  });

  it('sets isLibraryOwnerOrAdmin when libraryId context matches owner/admin', async () => {
    mockCollectionFindFirst.mockResolvedValue({ id: 'lib1' });
    const c = await getUserCapabilities('u1', { libraryId: 'lib1' });
    expect(c.canInvite).toBe(true);
  });

  it('returns canEnter=false for an unknown user', async () => {
    mockUserFindUnique.mockResolvedValue(null);
    const c = await getUserCapabilities('ghost');
    expect(c.canEnter).toBe(false);
    expect(c.canLend).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';

import { nonOwnerMemberRows, libraryMemberCount } from '../library-members';

const rows = [
  { userId: 'owner-1', role: 'member' },
  { userId: 'u2', role: 'member' },
  { userId: 'u3', role: 'admin' },
];

describe('nonOwnerMemberRows', () => {
  it("drops the owner's own member row (dirty data from #409)", () => {
    expect(nonOwnerMemberRows('owner-1', rows).map((r) => r.userId)).toEqual([
      'u2',
      'u3',
    ]);
  });
  it('passes clean data through unchanged', () => {
    expect(nonOwnerMemberRows('owner-0', rows)).toHaveLength(3);
  });
});

describe('libraryMemberCount', () => {
  it('counts owner once even when a self-member row exists', () => {
    expect(
      libraryMemberCount({ ownerId: 'owner-1', ownerActive: true, rows })
    ).toBe(3); // owner + u2 + u3, NOT 4
  });
  it('omits an inactive owner from the count', () => {
    expect(
      libraryMemberCount({ ownerId: 'owner-1', ownerActive: false, rows })
    ).toBe(2);
  });
});

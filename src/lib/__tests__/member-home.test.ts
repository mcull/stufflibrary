import { describe, it, expect } from 'vitest';

import {
  firstNameOf,
  initialsOf,
  dateStamp,
  cardNumber,
  folderTabLabel,
  splitLibraries,
  itemStamp,
  memberSinceLabel,
  restingRotation,
  shelfSummary,
  STAMP_INKS,
} from '../member-home';

describe('member-home helpers (#429 — vintage member home)', () => {
  it('derives first name and two-letter initials', () => {
    expect(firstNameOf('Anna Loomis')).toBe('Anna');
    expect(initialsOf('Anna Loomis')).toBe('AL');
    expect(initialsOf('Maya')).toBe('MA');
    expect(initialsOf('')).toBe('?');
  });

  it('formats the rubber date stamp like JUL 09 2026', () => {
    expect(dateStamp(new Date(2026, 6, 9))).toBe('JUL 09 2026');
    expect(dateStamp(new Date(2026, 11, 25))).toBe('DEC 25 2026');
  });

  it('derives a stable 000-000 card number from the user id', () => {
    const a = cardNumber('cmra9uiwn0001jq04hr4jb5rr');
    expect(a).toMatch(/^\d{3}-\d{3}$/);
    expect(cardNumber('cmra9uiwn0001jq04hr4jb5rr')).toBe(a); // deterministic
    expect(cardNumber('someone-else')).not.toBe(a);
  });

  it('folder tab shows the first word, clamped and uppercased', () => {
    expect(folderTabLabel('Elmwood Neighbors')).toBe('ELMWOOD');
    expect(folderTabLabel('Supercalifragilistic Crew')).toBe('SUPERCALIFRA');
  });

  it('splits collections into started vs joined', () => {
    const cols = [
      { id: '1', role: 'owner' },
      { id: '2', role: 'member' },
      { id: '3', role: 'admin' },
    ] as never[];
    const { started, joined } = splitLibraries(cols);
    expect(started.map((c: { id: string }) => c.id)).toEqual(['1']);
    expect(joined.map((c: { id: string }) => c.id)).toEqual(['2', '3']);
  });

  it('maps item statuses to stamps with the vintage ink colors', () => {
    expect(itemStamp({ status: 'ready-to-lend' })).toEqual({
      label: 'READY TO LEND',
      ink: STAMP_INKS.blue,
    });
    expect(
      itemStamp({
        status: 'on-loan',
        borrowRequest: { requestedReturnDate: '2026-07-18T00:00:00.000Z' },
      })
    ).toEqual({ label: 'DUE JUL 18', ink: STAMP_INKS.red });
    expect(itemStamp({ status: 'on-loan' })).toEqual({
      label: 'ON LOAN',
      ink: STAMP_INKS.red,
    });
    expect(itemStamp({ status: 'borrowed' })).toEqual({
      label: 'BORROWED',
      ink: STAMP_INKS.brown,
    });
    expect(itemStamp({ status: 'offline' })).toEqual({
      label: 'OFF SHELF',
      ink: STAMP_INKS.gray,
    });
  });

  it('summarizes a shelf into watercolor previews and loans out', () => {
    const rows = [
      { watercolorThumbUrl: 'a.webp', currentBorrowRequestId: null },
      { watercolorUrl: 'b.webp', currentBorrowRequestId: 'req1' },
      { watercolorThumbUrl: 'c.webp', currentBorrowRequestId: null },
      { watercolorThumbUrl: 'd.webp', currentBorrowRequestId: 'req2' },
      { watercolorThumbUrl: null, currentBorrowRequestId: null }, // no art
      { watercolorThumbUrl: 'e.webp', active: false }, // draft — ignored
    ];
    const s = shelfSummary(rows);
    expect(s.itemPreviews).toEqual(['a.webp', 'b.webp', 'c.webp']); // max 3
    expect(s.loansOut).toBe(2);
  });

  it('sums lifetime borrows across the shelf (#435 vitality stat)', () => {
    const s = shelfSummary([
      { watercolorThumbUrl: 'a.webp', borrowCount: 12 },
      { watercolorThumbUrl: 'b.webp', borrowCount: 0 },
      { watercolorThumbUrl: 'c.webp' }, // count missing → 0
      { watercolorThumbUrl: 'd.webp', borrowCount: 3, active: false }, // draft ignored
    ]);
    expect(s.totalBorrows).toBe(12);
  });

  it('formats the member-since eyebrow', () => {
    expect(memberSinceLabel(new Date(2026, 6, 9))).toBe(
      'MEMBER SINCE JUL 2026'
    );
    expect(memberSinceLabel(undefined)).toBe('STUFFLIBRARY MEMBER');
  });

  it('gives cards a small alternating resting rotation', () => {
    const rotations = [0, 1, 2, 3, 4].map(restingRotation);
    // Alternates sign and stays subtle (±0.6–1deg per spec).
    expect(rotations[0]).toBeLessThan(0);
    expect(rotations[1]).toBeGreaterThan(0);
    for (const r of rotations) {
      expect(Math.abs(r!)).toBeGreaterThanOrEqual(0.6);
      expect(Math.abs(r!)).toBeLessThanOrEqual(1);
    }
    expect(restingRotation(0)).toBe(restingRotation(4 * 1000)); // cyclic/deterministic
  });
});

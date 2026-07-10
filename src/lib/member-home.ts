// Pure helpers (house rule: no side-effectful imports) for the vintage
// member home (#429) — the little pieces of "library artifact" logic the
// design spec derives from data: stamps, card numbers, folder tabs.

export const STAMP_INKS = {
  blue: '#1e40af',
  red: '#dc2626',
  brown: '#7c2d12',
  gray: '#6b7280',
} as const;

const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const;

export function firstNameOf(name: string | null | undefined): string {
  return (name || '').trim().split(/\s+/)[0] || 'neighbor';
}

export function initialsOf(name: string | null | undefined): string {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  const letters =
    words.length === 1
      ? words[0]!.slice(0, 2)
      : words.map((w) => w[0]).join('');
  return letters.slice(0, 2).toUpperCase();
}

/** Rubber-stamp date: JUL 09 2026. */
export function dateStamp(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  return `${MONTHS[date.getMonth()]} ${dd} ${date.getFullYear()}`;
}

/**
 * Stable, human-plausible card number derived from the user id (cuids are
 * not numeric, but a member card wants digits). Purely cosmetic.
 */
export function cardNumber(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  const six = String(hash % 1_000_000).padStart(6, '0');
  return `${six.slice(0, 3)}-${six.slice(3)}`;
}

/** Folder tab: first word of the library name, uppercased, clamped. */
export function folderTabLabel(name: string): string {
  return (name.trim().split(/\s+/)[0] || 'LIBRARY').toUpperCase().slice(0, 12);
}

export function splitLibraries<T extends { role: string }>(
  collections: T[]
): { started: T[]; joined: T[] } {
  return {
    started: collections.filter((c) => c.role === 'owner'),
    joined: collections.filter((c) => c.role !== 'owner'),
  };
}

export interface ItemStamp {
  label: string;
  ink: string;
}

/** Status → rubber stamp, per the design's checkout-card ink language. */
export function itemStamp(item: {
  status: string;
  borrowRequest?:
    | { requestedReturnDate?: string | Date | null | undefined }
    | null
    | undefined;
}): ItemStamp {
  switch (item.status) {
    case 'ready-to-lend':
      return { label: 'READY TO LEND', ink: STAMP_INKS.blue };
    case 'on-loan': {
      const due = item.borrowRequest?.requestedReturnDate;
      if (due) {
        const d = new Date(due);
        const dd = String(d.getUTCDate()).padStart(2, '0');
        return {
          label: `DUE ${MONTHS[d.getUTCMonth()]} ${dd}`,
          ink: STAMP_INKS.red,
        };
      }
      return { label: 'ON LOAN', ink: STAMP_INKS.red };
    }
    case 'borrowed':
      return { label: 'BORROWED', ink: STAMP_INKS.brown };
    case 'offline':
      return { label: 'OFF SHELF', ink: STAMP_INKS.gray };
    default:
      return { label: 'ON THE SHELF', ink: STAMP_INKS.blue };
  }
}

/**
 * Folder-card shelf summary: up to 3 watercolor previews (in shelf order)
 * and how many items are out on loan. Draft items (active=false) don't count.
 */
export function shelfSummary(
  rows: Array<{
    watercolorThumbUrl?: string | null;
    watercolorUrl?: string | null;
    currentBorrowRequestId?: string | null;
    active?: boolean;
    /** Lifetime borrows of this item (#435 vitality stat). */
    borrowCount?: number;
  }>
): { itemPreviews: string[]; loansOut: number; totalBorrows: number } {
  const live = rows.filter((r) => r.active !== false);
  const itemPreviews = live
    .map((r) => r.watercolorThumbUrl || r.watercolorUrl)
    .filter((u): u is string => Boolean(u))
    .slice(0, 3);
  const loansOut = live.filter((r) => r.currentBorrowRequestId).length;
  const totalBorrows = live.reduce((sum, r) => sum + (r.borrowCount ?? 0), 0);
  return { itemPreviews, loansOut, totalBorrows };
}

/** Greeting eyebrow: the member-card fiction, unambiguous (#435). */
export function memberSinceLabel(
  createdAt: string | Date | null | undefined
): string {
  if (!createdAt) return 'STUFFLIBRARY MEMBER';
  const d = new Date(createdAt);
  return `MEMBER SINCE ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Subtle alternating resting tilt (±0.6–1deg) for shelf cards. */
const ROTATIONS = [-1, 0.8, -0.6, 0.9] as const;
export function restingRotation(index: number): number {
  return ROTATIONS[index % ROTATIONS.length]!;
}

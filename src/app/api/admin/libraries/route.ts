import { NextResponse } from 'next/server';

import { libraryCentroid } from '@/lib/admin/desk';
import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';

/**
 * One branch as the Atlas register sees it. A library owns no coordinates
 * of its own — `centroid` is the average of its active members' located
 * addresses AND the owner's (the owner is a member conceptually, not just a
 * fallback). It's null when nothing can be plotted: that branch lives in the
 * register marked "off map", never faked onto it. `memberCount` matches the
 * sibling admin/collections route: active members + 1 for the owner.
 */
export interface AdminLibraryRow {
  id: string;
  name: string;
  isArchived: boolean;
  createdAt: string; // ISO
  ownerName: string | null;
  memberCount: number;
  itemCount: number;
  borrows30d: number;
  centroid: { lat: number; lng: number } | null;
}

export interface AdminLibrariesResponse {
  libraries: AdminLibraryRow[];
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// A borrow only "counts" once it's a real loan — PENDING/DECLINED/CANCELLED
// requests never left the shelf, so they don't feed the activity stamp.
const REAL_BORROW_STATES = [
  'APPROVED',
  'ACTIVE',
  'RETURN_PENDING',
  'RETURNED',
] as const;

// Only active members of active users count — parity with the sibling
// admin/collections route so the two screens never disagree on head count.
const ACTIVE_MEMBER = { isActive: true, user: { status: 'active' } } as const;

const activeAddress = {
  where: { isActive: true },
  select: { latitude: true, longitude: true },
  take: 1,
} as const;

export async function GET() {
  try {
    await requireAdminAuth();

    // Flagged: include archived libraries — the register shows every branch.
    const libraries = await db.collection.findMany({
      select: {
        id: true,
        name: true,
        isArchived: true,
        createdAt: true,
        owner: {
          select: { name: true, addresses: activeAddress },
        },
        members: {
          where: ACTIVE_MEMBER,
          select: { user: { select: { addresses: activeAddress } } },
        },
        _count: { select: { members: { where: ACTIVE_MEMBER }, items: true } },
      },
    });

    const since = new Date(Date.now() - THIRTY_DAYS_MS);

    // Per-library borrow count. N+1 is acceptable for a glance-level admin
    // view at this scale; revisit (e.g. a single grouped query) if the
    // library count grows large.
    const rows: AdminLibraryRow[] = await Promise.all(
      libraries.map(async (lib): Promise<AdminLibraryRow> => {
        const borrows30d = await db.borrowRequest.count({
          where: {
            createdAt: { gte: since },
            status: { in: [...REAL_BORROW_STATES] },
            item: { collections: { some: { collectionId: lib.id } } },
          },
        });

        // Centroid = the average of every located point that belongs to this
        // branch: each active member's first active address PLUS the owner's.
        // The owner is a real point, not an all-or-nothing fallback; departed
        // and inactive members never pull the position. Null if none located.
        const points = [
          ...lib.members.map((m) => ({
            latitude: m.user.addresses[0]?.latitude ?? null,
            longitude: m.user.addresses[0]?.longitude ?? null,
          })),
          ...lib.owner.addresses.map((a) => ({
            latitude: a.latitude ?? null,
            longitude: a.longitude ?? null,
          })),
        ];
        const centroid = libraryCentroid(points);

        return {
          id: lib.id,
          name: lib.name,
          isArchived: lib.isArchived,
          createdAt: lib.createdAt.toISOString(),
          ownerName: lib.owner.name,
          memberCount: lib._count.members + 1, // +1 for the owner (not a member row)
          itemCount: lib._count.items,
          borrows30d,
          centroid,
        };
      })
    );

    // Non-archived first, then by member count desc — the busiest live
    // branches sit at the top of the register.
    rows.sort((a, b) => {
      if (a.isArchived !== b.isArchived) return a.isArchived ? 1 : -1;
      return b.memberCount - a.memberCount;
    });

    return NextResponse.json({
      libraries: rows,
    } satisfies AdminLibrariesResponse);
  } catch (error) {
    console.error('Admin libraries fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Access denied' },
      { status: 401 }
    );
  }
}

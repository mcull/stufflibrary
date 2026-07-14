import { NextResponse } from 'next/server';

import { libraryCentroid } from '@/lib/admin/desk';
import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';

/**
 * One branch as the Atlas register sees it. A library owns no coordinates
 * of its own — `centroid` is derived from its members' located addresses
 * (owner address as fallback) and is null when nothing can be plotted:
 * that branch lives in the register marked "off map", never faked onto it.
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
          select: { user: { select: { addresses: activeAddress } } },
        },
        _count: { select: { members: true, items: true } },
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
            item: { collections: { some: { collectionId: lib.id } } },
          },
        });

        // Centroid from members' located addresses; owner address as the
        // honest fallback. Null when neither is located — off map.
        const memberPoints = lib.members.map((m) => ({
          latitude: m.user.addresses[0]?.latitude ?? null,
          longitude: m.user.addresses[0]?.longitude ?? null,
        }));
        const ownerPoints = lib.owner.addresses.map((a) => ({
          latitude: a.latitude ?? null,
          longitude: a.longitude ?? null,
        }));
        const centroid =
          libraryCentroid(memberPoints) ?? libraryCentroid(ownerPoints);

        return {
          id: lib.id,
          name: lib.name,
          isArchived: lib.isArchived,
          createdAt: lib.createdAt.toISOString(),
          ownerName: lib.owner.name,
          memberCount: lib._count.members,
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

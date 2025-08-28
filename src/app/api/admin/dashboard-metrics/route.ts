import { NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    await requireAdminAuth();

    // Get key metrics
    const [
      totalUsers,
      activeUsers,
      totalItems,
      totalLibraries,
      pendingRequests,
      suspendedUsers,
      recentUsers,
      recentItems,
    ] = await Promise.all([
      // Total users
      db.user.count(),

      // Active users (users with status 'active')
      db.user.count({
        where: { status: 'active' },
      }),

      // Total items
      db.item.count(),

      // Total libraries
      db.library.count(),

      // Pending borrow requests
      db.borrowRequest.count({
        where: { status: 'PENDING' },
      }),

      // Suspended users
      db.user.count({
        where: { status: 'suspended' },
      }),

      // Users created in the last 7 days
      db.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Items created in the last 7 days
      db.item.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return NextResponse.json({
      metrics: {
        totalUsers,
        activeUsers,
        totalItems,
        totalLibraries,
        pendingRequests,
        suspendedUsers,
        recentUsers,
        recentItems,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Admin dashboard metrics fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Access denied' },
      { status: 401 }
    );
  }
}

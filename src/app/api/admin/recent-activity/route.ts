import { NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    await requireAdminAuth();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get recent activities from different entities
    const [recentUsers, recentItems, recentRequests, recentLibraries] =
      await Promise.all([
        // Recent users
        db.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: Math.floor(limit / 4),
        }),

        // Recent items
        db.item.findMany({
          select: {
            id: true,
            name: true,
            createdAt: true,
            owner: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: Math.floor(limit / 4),
        }),

        // Recent borrow requests
        db.borrowRequest.findMany({
          select: {
            id: true,
            status: true,
            createdAt: true,
            borrower: {
              select: {
                name: true,
                email: true,
              },
            },
            item: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: Math.floor(limit / 4),
        }),

        // Recent libraries
        db.library.findMany({
          select: {
            id: true,
            name: true,
            createdAt: true,
            owner: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: Math.floor(limit / 4),
        }),
      ]);

    // Combine and format activities
    const activities = [
      ...recentUsers.map((user) => ({
        id: `user-${user.id}`,
        type: 'user_created',
        title: 'New user registered',
        description: `${user.name || user.email} joined the platform`,
        timestamp: user.createdAt,
        metadata: {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
        },
      })),
      ...recentItems.map((item) => ({
        id: `item-${item.id}`,
        type: 'item_created',
        title: 'New item added',
        description: `${item.owner.name || item.owner.email} added "${item.name}"`,
        timestamp: item.createdAt,
        metadata: {
          itemId: item.id,
          itemName: item.name,
          ownerName: item.owner.name,
        },
      })),
      ...recentRequests.map((request) => ({
        id: `request-${request.id}`,
        type: 'borrow_request',
        title: 'Borrow request created',
        description: `${request.borrower.name || request.borrower.email} requested "${request.item.name}"`,
        timestamp: request.createdAt,
        metadata: {
          requestId: request.id,
          status: request.status,
          borrowerName: request.borrower.name,
          itemName: request.item.name,
        },
      })),
      ...recentLibraries.map((library) => ({
        id: `library-${library.id}`,
        type: 'library_created',
        title: 'New library created',
        description: `${library.owner.name || library.owner.email} created library "${library.name}"`,
        timestamp: library.createdAt,
        metadata: {
          libraryId: library.id,
          libraryName: library.name,
          ownerName: library.owner.name,
        },
      })),
    ];

    // Sort by timestamp and limit
    const sortedActivities = activities
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, limit);

    return NextResponse.json({
      activities: sortedActivities,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Admin recent activity fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Access denied' },
      { status: 401 }
    );
  }
}

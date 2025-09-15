import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: itemId } = await params;

    // Get item details to verify it exists and get name
    const item = await db.item.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        name: true,
        ownerId: true,
        collections: {
          select: {
            collection: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Get user ID from session
    const userId =
      (session.user as any).id ||
      (session as any).user?.id ||
      (session as any).userId;

    // Check if user has access to this item (owner or same library member)
    const userHasAccess = await db.user.findFirst({
      where: {
        id: userId,
        OR: [
          { id: item.ownerId }, // User is the owner
          ...(item.collections.length > 0
            ? [
                {
                  collectionMemberships: {
                    some: {
                      collectionId: {
                        in: item.collections.map((ic) => ic.collection.id),
                      },
                      isActive: true,
                    },
                  },
                },
              ]
            : []), // User is in the same library (if item has libraries)
        ],
      },
    });

    if (!userHasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get borrow history for this item
    const allBorrowHistory = await db.borrowRequest.findMany({
      where: {
        itemId: itemId,
        status: { in: ['APPROVED', 'ACTIVE', 'RETURNED'] }, // Only show meaningful borrows
      },
      include: {
        borrower: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Filter out self-borrows (offline status) from history display
    const borrowHistory = allBorrowHistory.filter(
      (record) => record.borrowerId !== record.lenderId
    );

    return NextResponse.json({
      itemName: item.name,
      borrowHistory: borrowHistory.map((record) => ({
        id: record.id,
        status: record.status,
        borrower: record.borrower,
        requestMessage: record.requestMessage,
        promisedReturnBy: record.requestedReturnDate,
        requestedReturnDate: record.requestedReturnDate,
        actualReturnDate: record.actualReturnDate,
        returnedAt: record.returnedAt,
        approvedAt: record.approvedAt,
        requestedAt: record.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching borrow history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch borrow history' },
      { status: 500 }
    );
  }
}

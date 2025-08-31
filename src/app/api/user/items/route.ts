import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID
    const userId =
      (session.user as { id?: string }).id ||
      (session as { user?: { id?: string }; userId?: string }).user?.id ||
      (session as { user?: { id?: string }; userId?: string }).userId;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    // Get user's items
    const items = await db.item.findMany({
      where: {
        ownerId: userId,
      },
      include: {
        stuffType: {
          select: {
            displayName: true,
            category: true,
          },
        },
        libraries: {
          include: {
            library: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            borrowRequests: {
              where: {
                status: 'ACTIVE',
              },
            },
          },
        },
        borrowRequests: {
          where: {
            status: 'ACTIVE',
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
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format the response
    const formattedItems = items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      currentBorrowRequestId: item.currentBorrowRequestId, // Include this field for filtering
      isAvailable: !item.currentBorrowRequestId, // Computed from currentBorrowRequestId
      canBeBorrowed: !item.currentBorrowRequestId, // Computed field for actual borrowability
      condition: item.condition,
      location: item.location,
      createdAt: item.createdAt,
      stuffType: item.stuffType || null,
      libraries: (item as any).libraries?.map((il: any) => il.library) || [],
      owner: (item as any).owner || null,
      isOnLoan: !!item.currentBorrowRequestId,
      activeBorrower: item.borrowRequests[0]?.borrower || null,
    }));

    return NextResponse.json({ items: formattedItems });
  } catch (error) {
    console.error('Error fetching user items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user items' },
      { status: 500 }
    );
  }
}

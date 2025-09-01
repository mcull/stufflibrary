import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: itemId } = await params;

    // Get item details
    const item = await db.item.findUnique({
      where: { id: itemId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        stuffType: {
          select: {
            displayName: true,
            category: true,
            iconPath: true,
          },
        },
        libraries: {
          select: {
            library: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        borrowRequests: {
          where: {
            status: { in: ['ACTIVE', 'APPROVED'] },
          },
          include: {
            borrower: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            lender: {
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
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Check if user can access this item
    const userId =
      (session.user as any).id ||
      (session as any).user?.id ||
      (session as any).userId;

    // Only owners can access draft items (active=false)
    if (!item.active && item.ownerId !== userId) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Format response
    const activeBorrowRequest = item.borrowRequests?.[0] || null;
    const formattedItem = {
      id: item.id,
      name: item.name,
      description: item.description,
      condition: item.condition,
      location: item.location,
      imageUrl: item.imageUrl,
      watercolorUrl: item.watercolorUrl,
      watercolorThumbUrl: item.watercolorThumbUrl,
      isAvailable: !item.currentBorrowRequestId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      owner: item.owner,
      stuffType: item.stuffType,
      libraries: item.libraries.map((il) => il.library),
      currentActiveBorrow: activeBorrowRequest,
    };

    return NextResponse.json({ item: formattedItem });
  } catch (error) {
    console.error('Error fetching item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch item' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId =
      (session.user as any).id ||
      (session as any).user?.id ||
      (session as any).userId;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const { id: itemId } = await params;
    const body = await request.json();
    const { name, description, condition, location } = body;

    // Check if user owns the item
    const item = await db.item.findUnique({
      where: { id: itemId },
      select: { ownerId: true },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (item.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Only the item owner can update item details' },
        { status: 403 }
      );
    }

    // Validate input
    if (name && name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Item name cannot be empty' },
        { status: 400 }
      );
    }

    if (name && name.length > 200) {
      return NextResponse.json(
        { error: 'Item name must be 200 characters or less' },
        { status: 400 }
      );
    }

    if (description && description.length > 1000) {
      return NextResponse.json(
        { error: 'Description must be 1000 characters or less' },
        { status: 400 }
      );
    }

    if (location && location.length > 100) {
      return NextResponse.json(
        { error: 'Location must be 100 characters or less' },
        { status: 400 }
      );
    }

    const validConditions = ['excellent', 'good', 'fair', 'poor'];
    if (condition && !validConditions.includes(condition)) {
      return NextResponse.json(
        { error: 'Invalid condition value' },
        { status: 400 }
      );
    }

    // Update item
    const updatedItem = await db.item.update({
      where: { id: itemId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
        ...(condition !== undefined && { condition }),
        ...(location !== undefined && { location: location?.trim() || null }),
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        stuffType: {
          select: {
            displayName: true,
            category: true,
            iconPath: true,
          },
        },
        libraries: {
          select: {
            library: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Format response
    const formattedItem = {
      id: updatedItem.id,
      name: updatedItem.name,
      description: updatedItem.description,
      condition: updatedItem.condition,
      location: updatedItem.location,
      imageUrl: updatedItem.imageUrl,
      isAvailable: !updatedItem.currentBorrowRequestId,
      createdAt: updatedItem.createdAt,
      updatedAt: updatedItem.updatedAt,
      owner: updatedItem.owner,
      stuffType: updatedItem.stuffType,
      libraries: updatedItem.libraries?.map((il) => il.library) || [],
    };

    return NextResponse.json({ item: formattedItem });
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId =
      (session.user as any).id ||
      (session as any).user?.id ||
      (session as any).userId;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const { id: itemId } = await params;
    const body = await request.json();
    const { isAvailable, libraryIds } = body;

    // Check if user owns the item
    const item = await db.item.findUnique({
      where: { id: itemId },
      select: { ownerId: true, currentBorrowRequestId: true },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (item.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Only the item owner can toggle availability' },
        { status: 403 }
      );
    }

    // Validate input
    if (isAvailable !== undefined && typeof isAvailable !== 'boolean') {
      return NextResponse.json(
        { error: 'isAvailable must be a boolean' },
        { status: 400 }
      );
    }

    // Check if item is currently borrowed
    const activeBorrow = await db.borrowRequest.findFirst({
      where: {
        itemId,
        status: { in: ['APPROVED', 'ACTIVE'] },
      },
    });

    if (activeBorrow && isAvailable === false) {
      return NextResponse.json(
        { error: 'Cannot mark item as unavailable while it is borrowed' },
        { status: 400 }
      );
    }

    // Handle offline/online toggle through borrow request creation/deletion
    if (isAvailable !== undefined) {
      if (isAvailable === false) {
        // Taking offline: Create a self-borrow request to mark as unavailable
        const existingSelfBorrow = await db.borrowRequest.findFirst({
          where: {
            itemId,
            borrowerId: userId,
            lenderId: userId,
            status: 'ACTIVE',
          },
        });

        if (!existingSelfBorrow) {
          const selfBorrowRequest = await db.borrowRequest.create({
            data: {
              itemId,
              borrowerId: userId,
              lenderId: userId,
              status: 'ACTIVE',
              requestMessage: 'Item taken offline by owner',
              requestedReturnDate: new Date(
                Date.now() + 365 * 24 * 60 * 60 * 1000
              ), // 1 year from now
            },
          });

          // Update item to reference this self-borrow request
          await db.item.update({
            where: { id: itemId },
            data: { currentBorrowRequestId: selfBorrowRequest.id },
          });
        }
      } else {
        // Taking online: Remove self-borrow request
        const selfBorrowRequest = await db.borrowRequest.findFirst({
          where: {
            itemId,
            borrowerId: userId,
            lenderId: userId,
            status: 'ACTIVE',
          },
        });

        if (selfBorrowRequest) {
          // Update to returned status and clear currentBorrowRequestId
          await db.borrowRequest.update({
            where: { id: selfBorrowRequest.id },
            data: { status: 'RETURNED', returnedAt: new Date() },
          });

          await db.item.update({
            where: { id: itemId },
            data: { currentBorrowRequestId: null },
          });
        }
      }
    }

    // Get updated item
    const updatedItem = await db.item.findUnique({
      where: { id: itemId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        stuffType: {
          select: {
            displayName: true,
            category: true,
            iconPath: true,
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
        borrowRequests: {
          where: {
            status: { in: ['ACTIVE', 'APPROVED'] },
          },
          include: {
            borrower: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            lender: {
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
    });

    // Handle library assignments if provided
    if (libraryIds && Array.isArray(libraryIds)) {
      // Delete existing library relationships
      await db.itemLibrary.deleteMany({
        where: { itemId },
      });

      // Create new library relationships
      if (libraryIds.length > 0) {
        await db.$transaction(
          libraryIds.map((libraryId: string) =>
            db.itemLibrary.create({
              data: {
                itemId,
                libraryId,
              },
            })
          )
        );
      }

      // Refetch item with updated library relationships
      const itemWithLibraries = await db.item.findUnique({
        where: { id: itemId },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          stuffType: {
            select: {
              displayName: true,
              category: true,
              iconPath: true,
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
          borrowRequests: {
            where: {
              status: { in: ['ACTIVE', 'APPROVED'] },
            },
            include: {
              borrower: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
              lender: {
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
      });

      // Format response with libraries
      const activeBorrowRequestWithLibraries =
        itemWithLibraries!.borrowRequests?.[0] || null;
      const formattedItemWithLibraries = {
        id: itemWithLibraries!.id,
        name: itemWithLibraries!.name,
        description: itemWithLibraries!.description,
        condition: itemWithLibraries!.condition,
        location: itemWithLibraries!.location,
        imageUrl: itemWithLibraries!.imageUrl,
        isAvailable: !itemWithLibraries!.currentBorrowRequestId,
        createdAt: itemWithLibraries!.createdAt,
        updatedAt: itemWithLibraries!.updatedAt,
        owner: itemWithLibraries!.owner,
        stuffType: itemWithLibraries!.stuffType,
        libraries: itemWithLibraries!.libraries.map((il) => il.library),
        currentActiveBorrow: activeBorrowRequestWithLibraries,
      };

      return NextResponse.json({
        item: formattedItemWithLibraries,
        message: `Item added to ${libraryIds.length} ${libraryIds.length === 1 ? 'library' : 'libraries'}`,
      });
    }

    // Format response
    const activeBorrowRequest = updatedItem!.borrowRequests?.[0] || null;
    const formattedItem = {
      id: updatedItem!.id,
      name: updatedItem!.name,
      description: updatedItem!.description,
      condition: updatedItem!.condition,
      location: updatedItem!.location,
      imageUrl: updatedItem!.imageUrl,
      isAvailable: !updatedItem!.currentBorrowRequestId,
      createdAt: updatedItem!.createdAt,
      updatedAt: updatedItem!.updatedAt,
      owner: updatedItem!.owner,
      stuffType: updatedItem!.stuffType,
      libraries: updatedItem!.libraries.map((il) => il.library),
      currentActiveBorrow: activeBorrowRequest,
    };

    return NextResponse.json({
      item: formattedItem,
      message: 'Item updated successfully',
    });
  } catch (error) {
    console.error('Error toggling item availability:', error);
    return NextResponse.json(
      { error: 'Failed to toggle item availability' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId =
      (session.user as any).id ||
      (session as any).user?.id ||
      (session as any).userId;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const { id: itemId } = await params;

    // Check if user owns the item and get item details
    const item = await db.item.findUnique({
      where: { id: itemId },
      select: {
        ownerId: true,
        name: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (item.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Only the item owner can remove items' },
        { status: 403 }
      );
    }

    // Check if item is currently borrowed
    const activeBorrow = await db.borrowRequest.findFirst({
      where: {
        itemId,
        status: { in: ['APPROVED', 'ACTIVE'] },
      },
    });

    if (activeBorrow) {
      return NextResponse.json(
        { error: 'Cannot remove item that is currently borrowed' },
        { status: 400 }
      );
    }

    // Remove the item (this will cascade to related records)
    await db.item.delete({
      where: { id: itemId },
    });

    return NextResponse.json({
      message: `"${item.name}" has been removed`,
    });
  } catch (error) {
    console.error('Error removing item:', error);
    return NextResponse.json(
      { error: 'Failed to remove item' },
      { status: 500 }
    );
  }
}

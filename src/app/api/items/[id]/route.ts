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
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Format response
    const formattedItem = {
      id: item.id,
      name: item.name,
      description: item.description,
      condition: item.condition,
      location: item.location,
      imageUrl: item.imageUrl,
      isAvailable: item.isAvailable,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      owner: item.owner,
      stuffType: item.stuffType,
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
      isAvailable: updatedItem.isAvailable,
      createdAt: updatedItem.createdAt,
      updatedAt: updatedItem.updatedAt,
      owner: updatedItem.owner,
      stuffType: updatedItem.stuffType,
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
    const { isAvailable, branchId } = body;

    // Check if user owns the item
    const item = await db.item.findUnique({
      where: { id: itemId },
      select: { ownerId: true, isAvailable: true },
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

    if (branchId !== undefined && typeof branchId !== 'string') {
      return NextResponse.json(
        { error: 'branchId must be a string' },
        { status: 400 }
      );
    }

    // If branchId is being changed, validate user has access to the branch
    if (branchId !== undefined) {
      const branchMembership = await db.branchMember.findUnique({
        where: {
          userId_branchId: {
            userId,
            branchId,
          },
        },
      });

      if (!branchMembership) {
        return NextResponse.json(
          { error: 'You are not a member of the specified branch' },
          { status: 403 }
        );
      }
    }

    // Check if item is currently borrowed
    const activeBorrow = await db.borrowRequest.findFirst({
      where: {
        itemId,
        status: { in: ['approved', 'active'] },
      },
    });

    if (activeBorrow && !isAvailable) {
      return NextResponse.json(
        { error: 'Cannot mark item as in use while it is borrowed' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (isAvailable !== undefined) {
      updateData.isAvailable = isAvailable;
    }
    if (branchId !== undefined) {
      updateData.branchId = branchId;
    }

    // Update item
    const updatedItem = await db.item.update({
      where: { id: itemId },
      data: updateData,
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
      isAvailable: updatedItem.isAvailable,
      createdAt: updatedItem.createdAt,
      updatedAt: updatedItem.updatedAt,
      owner: updatedItem.owner,
      stuffType: updatedItem.stuffType,
    };

    return NextResponse.json({
      item: formattedItem,
      message: isAvailable
        ? 'Item marked as available'
        : 'Item marked as in use',
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
        branchId: true,
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
        status: { in: ['approved', 'active'] },
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
      message: `"${item.name}" has been removed from your branch`,
      branchId: item.branchId,
    });
  } catch (error) {
    console.error('Error removing item:', error);
    return NextResponse.json(
      { error: 'Failed to remove item' },
      { status: 500 }
    );
  }
}

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

    const { id: libraryId } = await params;

    // Get library details
    const library = await db.library.findUnique({
      where: { id: libraryId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
            addresses: {
              where: { isActive: true },
              select: {
                address1: true,
                city: true,
                state: true,
                latitude: true,
                longitude: true,
                formattedAddress: true,
              },
              take: 1,
            },
          },
        },
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                email: true,
                addresses: {
                  where: { isActive: true },
                  select: {
                    address1: true,
                    city: true,
                    state: true,
                    latitude: true,
                    longitude: true,
                    formattedAddress: true,
                  },
                  take: 1,
                },
              },
            },
          },
          orderBy: [
            { role: 'desc' }, // admins first
            { joinedAt: 'asc' }, // then by join date
          ],
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!library) {
      return NextResponse.json({ error: 'Library not found' }, { status: 404 });
    }

    // Get library items (only active items)
    const items = await db.item.findMany({
      where: {
        libraries: {
          some: {
            libraryId: libraryId,
          },
        },
        active: true, // Only show active items
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
            iconPath: true,
            category: true,
          },
        },
        borrowRequests: {
          where: {
            status: { in: ['PENDING', 'APPROVED', 'ACTIVE'] },
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
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ name: 'asc' }],
    });

    // Check if user has access to this library
    const userId =
      (session.user as any).id ||
      (session as any).user?.id ||
      (session as any).userId;

    const userRole = userId === library.ownerId ? 'owner' : null;
    const membership = library.members.find(
      (member) => member.userId === userId
    );

    if (!userRole && !membership && !library.isPublic) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Format response
    const formattedLibrary = {
      id: library.id,
      name: library.name,
      description: library.description,
      location: library.location,
      isPublic: library.isPublic,
      createdAt: library.createdAt,
      updatedAt: library.updatedAt,
      owner: library.owner,
      userRole: userRole || membership?.role || null,
      memberCount: library._count.members + 1, // +1 for owner
      itemCount: items.length,
      members: [
        // Include owner as first member
        {
          id: 'owner-' + library.owner.id,
          role: 'owner',
          joinedAt: library.createdAt,
          user: library.owner,
        },
        // Then include other members
        ...library.members.map((member) => ({
          id: member.id,
          role: member.role,
          joinedAt: member.joinedAt,
          user: member.user,
        })),
      ],
      items: items.map((item) => {
        const activeBorrow = item.borrowRequests.find(
          (req) => req.status === 'ACTIVE' || req.status === 'APPROVED'
        );
        const pendingRequests = item.borrowRequests.filter(
          (req) => req.status === 'PENDING'
        );

        return {
          id: item.id,
          name: item.name,
          description: item.description,
          condition: item.condition,
          imageUrl: item.imageUrl,
          watercolorThumbUrl: item.watercolorThumbUrl,
          isAvailable: !item.currentBorrowRequestId,
          createdAt: item.createdAt,
          category: item.stuffType?.category || 'other',
          stuffType: item.stuffType,
          owner: item.owner,
          isOwnedByUser: item.ownerId === userId,
          currentBorrow: activeBorrow
            ? {
                id: activeBorrow.id,
                borrower: activeBorrow.borrower,
                lender: activeBorrow.lender,
                dueDate: activeBorrow.requestedReturnDate,
                borrowedAt: activeBorrow.approvedAt,
              }
            : null,
          notificationQueue: pendingRequests.map((req) => ({
            id: req.id,
            user: req.borrower,
            requestedAt: req.createdAt,
          })),
          queueDepth: pendingRequests.length,
        };
      }),
      itemsByCategory: items.reduce(
        (acc, item) => {
          const category = item.stuffType?.category || 'other';
          if (!acc[category]) {
            acc[category] = [];
          }

          const activeBorrow = item.borrowRequests.find(
            (req) => req.status === 'ACTIVE' || req.status === 'APPROVED'
          );
          const pendingRequests = item.borrowRequests.filter(
            (req) => req.status === 'PENDING'
          );

          acc[category].push({
            id: item.id,
            name: item.name,
            description: item.description,
            condition: item.condition,
            imageUrl: item.imageUrl,
            watercolorThumbUrl: item.watercolorThumbUrl,
            isAvailable: !item.currentBorrowRequestId,
            createdAt: item.createdAt,
            stuffType: item.stuffType,
            owner: item.owner,
            isOwnedByUser: item.ownerId === userId,
            currentBorrow: activeBorrow
              ? {
                  id: activeBorrow.id,
                  borrower: activeBorrow.borrower,
                  lender: activeBorrow.lender,
                  dueDate: activeBorrow.requestedReturnDate,
                  borrowedAt: activeBorrow.approvedAt,
                }
              : null,
            notificationQueue: pendingRequests.map((req) => ({
              id: req.id,
              user: req.borrower,
              requestedAt: req.createdAt,
            })),
            queueDepth: pendingRequests.length,
          });

          return acc;
        },
        {} as Record<string, any[]>
      ),
    };

    return NextResponse.json({ library: formattedLibrary });
  } catch (error) {
    console.error('Error fetching library:', error);
    return NextResponse.json(
      { error: 'Failed to fetch library' },
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

    const { id: libraryId } = await params;
    const body = await request.json();
    const { name, description, location, isPublic } = body;

    // Check if user is the owner or admin
    const library = await db.library.findUnique({
      where: { id: libraryId },
      include: {
        members: {
          where: {
            userId,
            isActive: true,
            role: 'admin',
          },
        },
      },
    });

    if (!library) {
      return NextResponse.json({ error: 'Library not found' }, { status: 404 });
    }

    const isOwner = library.ownerId === userId;
    const isAdmin = library.members.length > 0;

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Only library owners and admins can update library details' },
        { status: 403 }
      );
    }

    // Validate input
    if (name && name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Library name cannot be empty' },
        { status: 400 }
      );
    }

    if (name && name.length > 100) {
      return NextResponse.json(
        { error: 'Library name must be 100 characters or less' },
        { status: 400 }
      );
    }

    // Update library
    const updatedLibrary = await db.library.update({
      where: { id: libraryId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
        ...(location !== undefined && { location: location?.trim() || null }),
        ...(isPublic !== undefined && { isPublic: Boolean(isPublic) }),
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            members: true,
            items: {
              where: {
                item: { currentBorrowRequestId: null },
              },
            },
          },
        },
      },
    });

    // Format response
    const formattedLibrary = {
      id: updatedLibrary.id,
      name: updatedLibrary.name,
      description: updatedLibrary.description,
      location: updatedLibrary.location,
      isPublic: updatedLibrary.isPublic,
      createdAt: updatedLibrary.createdAt,
      updatedAt: updatedLibrary.updatedAt,
      owner: updatedLibrary.owner,
      memberCount: updatedLibrary._count.members + 1,
      itemCount: updatedLibrary._count.items,
    };

    return NextResponse.json({ library: formattedLibrary });
  } catch (error) {
    console.error('Error updating library:', error);
    return NextResponse.json(
      { error: 'Failed to update library' },
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

    const { id: libraryId } = await params;

    // Check if user is the owner
    const library = await db.library.findUnique({
      where: { id: libraryId },
      select: {
        ownerId: true,
        _count: {
          select: {
            items: true,
            members: true,
          },
        },
      },
    });

    if (!library) {
      return NextResponse.json({ error: 'Library not found' }, { status: 404 });
    }

    if (library.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Only library owners can delete libraries' },
        { status: 403 }
      );
    }

    // Check if library has items or members
    if (library._count.items > 0 || library._count.members > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot delete library with items or members. Remove all items and members first.',
        },
        { status: 400 }
      );
    }

    // Delete the library
    await db.library.delete({
      where: { id: libraryId },
    });

    return NextResponse.json({ message: 'Library deleted successfully' });
  } catch (error) {
    console.error('Error deleting library:', error);
    return NextResponse.json(
      { error: 'Failed to delete library' },
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

    const { id: libraryId } = await params;

    // Check if user has permission to edit (owner or admin)
    const library = await db.library.findUnique({
      where: { id: libraryId },
      select: {
        ownerId: true,
      },
    });

    if (!library) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    const isOwner = library.ownerId === userId;

    // Check if user is an admin member (if not owner)
    let isAdmin = false;
    if (!isOwner) {
      const membership = await db.libraryMember.findUnique({
        where: {
          userId_libraryId: {
            userId,
            libraryId,
          },
        },
        select: {
          role: true,
        },
      });
      isAdmin = membership?.role === 'admin';
    }

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Only library owners and admins can edit collections' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, description, location, isPublic } = body;

    // Validation
    const updates: any = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Collection name is required and must be a string' },
          { status: 400 }
        );
      }
      if (name.trim().length > 30) {
        return NextResponse.json(
          { error: 'Collection name must be 30 characters or less' },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      if (typeof description !== 'string') {
        return NextResponse.json(
          { error: 'Description must be a string' },
          { status: 400 }
        );
      }
      if (description.length > 500) {
        return NextResponse.json(
          { error: 'Description must be 500 characters or less' },
          { status: 400 }
        );
      }
      updates.description = description || null;
    }

    if (location !== undefined) {
      if (typeof location !== 'string') {
        return NextResponse.json(
          { error: 'Location must be a string' },
          { status: 400 }
        );
      }
      if (location.length > 25) {
        return NextResponse.json(
          { error: 'Location must be 25 characters or less' },
          { status: 400 }
        );
      }
      updates.location = location || null;
    }

    if (isPublic !== undefined) {
      if (typeof isPublic !== 'boolean') {
        return NextResponse.json(
          { error: 'isPublic must be a boolean' },
          { status: 400 }
        );
      }
      updates.isPublic = isPublic;
    }

    // If no valid updates, return success without making changes
    if (Object.keys(updates).length === 0) {
      const library = await db.library.findUnique({
        where: { id: libraryId },
        select: {
          id: true,
          name: true,
          description: true,
          location: true,
          isPublic: true,
        },
      });

      return NextResponse.json({ collection: library });
    }

    // Update the library
    const updatedLibrary = await db.library.update({
      where: { id: libraryId },
      data: updates,
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        isPublic: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ collection: updatedLibrary });
  } catch (error) {
    console.error('Error updating library:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to update library' },
      { status: 500 }
    );
  }
}

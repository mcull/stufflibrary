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

    const { id: branchId } = await params;

    // Get branch details
    const branch = await db.branch.findUnique({
      where: { id: branchId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
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
              },
            },
          },
          orderBy: [
            { role: 'desc' }, // admins first
            { joinedAt: 'asc' }, // then by join date
          ],
        },
        items: {
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
                status: { in: ['pending', 'approved', 'active'] },
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
              orderBy: { requestedAt: 'asc' },
            },
          },
          orderBy: [{ stuffType: { category: 'asc' } }, { name: 'asc' }],
        },
        _count: {
          select: {
            members: true,
            items: true,
          },
        },
      },
    });

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    // Check if user has access to this branch
    const userId =
      (session.user as any).id ||
      (session as any).user?.id ||
      (session as any).userId;

    const userRole = userId === branch.ownerId ? 'owner' : null;
    const membership = branch.members.find(
      (member) => member.userId === userId
    );

    if (!userRole && !membership && !branch.isPublic) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Format response
    const formattedBranch = {
      id: branch.id,
      name: branch.name,
      description: branch.description,
      location: branch.location,
      isPublic: branch.isPublic,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
      owner: branch.owner,
      userRole: userRole || membership?.role || null,
      memberCount: branch._count.members + 1, // +1 for owner
      itemCount: branch._count.items,
      members: [
        // Include owner as first member
        {
          id: 'owner-' + branch.owner.id,
          role: 'owner',
          joinedAt: branch.createdAt,
          user: branch.owner,
        },
        // Then include other members
        ...branch.members.map((member) => ({
          id: member.id,
          role: member.role,
          joinedAt: member.joinedAt,
          user: member.user,
        })),
      ],
      items: branch.items.map((item) => {
        const activeBorrow = item.borrowRequests.find(
          (req) => req.status === 'active'
        );
        const pendingRequests = item.borrowRequests.filter(
          (req) => req.status === 'pending'
        );

        return {
          id: item.id,
          name: item.name,
          description: item.description,
          condition: item.condition,
          imageUrl: item.imageUrl,
          isAvailable: item.isAvailable,
          createdAt: item.createdAt,
          category: item.stuffType?.category || 'other',
          stuffType: item.stuffType,
          owner: item.owner,
          isOwnedByUser: item.ownerId === userId,
          currentBorrow: activeBorrow
            ? {
                id: activeBorrow.id,
                borrower: activeBorrow.borrower,
                dueDate: activeBorrow.dueDate,
                borrowedAt: activeBorrow.borrowedAt,
              }
            : null,
          notificationQueue: pendingRequests.map((req) => ({
            id: req.id,
            user: req.borrower,
            requestedAt: req.requestedAt,
          })),
          queueDepth: pendingRequests.length,
        };
      }),
      itemsByCategory: branch.items.reduce(
        (acc, item) => {
          const category = item.stuffType?.category || 'other';
          if (!acc[category]) {
            acc[category] = [];
          }

          const activeBorrow = item.borrowRequests.find(
            (req) => req.status === 'active'
          );
          const pendingRequests = item.borrowRequests.filter(
            (req) => req.status === 'pending'
          );

          acc[category].push({
            id: item.id,
            name: item.name,
            description: item.description,
            condition: item.condition,
            imageUrl: item.imageUrl,
            isAvailable: item.isAvailable,
            createdAt: item.createdAt,
            stuffType: item.stuffType,
            owner: item.owner,
            isOwnedByUser: item.ownerId === userId,
            currentBorrow: activeBorrow
              ? {
                  id: activeBorrow.id,
                  borrower: activeBorrow.borrower,
                  dueDate: activeBorrow.dueDate,
                  borrowedAt: activeBorrow.borrowedAt,
                }
              : null,
            notificationQueue: pendingRequests.map((req) => ({
              id: req.id,
              user: req.borrower,
              requestedAt: req.requestedAt,
            })),
            queueDepth: pendingRequests.length,
          });

          return acc;
        },
        {} as Record<string, any[]>
      ),
    };

    return NextResponse.json({ branch: formattedBranch });
  } catch (error) {
    console.error('Error fetching branch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch branch' },
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

    const { id: branchId } = await params;
    const body = await request.json();
    const { name, description, location, isPublic } = body;

    // Check if user is the owner or admin
    const branch = await db.branch.findUnique({
      where: { id: branchId },
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

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    const isOwner = branch.ownerId === userId;
    const isAdmin = branch.members.length > 0;

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Only branch owners and admins can update branch details' },
        { status: 403 }
      );
    }

    // Validate input
    if (name && name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Branch name cannot be empty' },
        { status: 400 }
      );
    }

    if (name && name.length > 100) {
      return NextResponse.json(
        { error: 'Branch name must be 100 characters or less' },
        { status: 400 }
      );
    }

    // Update branch
    const updatedBranch = await db.branch.update({
      where: { id: branchId },
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
            items: true,
          },
        },
      },
    });

    // Format response
    const formattedBranch = {
      id: updatedBranch.id,
      name: updatedBranch.name,
      description: updatedBranch.description,
      location: updatedBranch.location,
      isPublic: updatedBranch.isPublic,
      createdAt: updatedBranch.createdAt,
      updatedAt: updatedBranch.updatedAt,
      owner: updatedBranch.owner,
      memberCount: updatedBranch._count.members + 1,
      itemCount: updatedBranch._count.items,
    };

    return NextResponse.json({ branch: formattedBranch });
  } catch (error) {
    console.error('Error updating branch:', error);
    return NextResponse.json(
      { error: 'Failed to update branch' },
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

    const { id: branchId } = await params;

    // Check if user is the owner
    const branch = await db.branch.findUnique({
      where: { id: branchId },
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

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    if (branch.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Only branch owners can delete branches' },
        { status: 403 }
      );
    }

    // Check if branch has items or members
    if (branch._count.items > 0 || branch._count.members > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot delete branch with items or members. Remove all items and members first.',
        },
        { status: 400 }
      );
    }

    // Delete the branch
    await db.branch.delete({
      where: { id: branchId },
    });

    return NextResponse.json({ message: 'Branch deleted successfully' });
  } catch (error) {
    console.error('Error deleting branch:', error);
    return NextResponse.json(
      { error: 'Failed to delete branch' },
      { status: 500 }
    );
  }
}

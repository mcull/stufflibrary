import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
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

    // Check if branch exists and is joinable
    const branch = await db.branch.findUnique({
      where: { id: branchId },
      select: {
        id: true,
        name: true,
        isPublic: true,
        ownerId: true,
      },
    });

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    // Check if user is already the owner
    if (branch.ownerId === userId) {
      return NextResponse.json(
        { error: 'You are already the owner of this branch' },
        { status: 400 }
      );
    }

    // For now, only allow joining public branches
    // TODO: Add invitation system for private branches
    if (!branch.isPublic) {
      return NextResponse.json(
        { error: 'This branch is private and requires an invitation' },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const existingMembership = await db.branchMember.findUnique({
      where: {
        userId_branchId: {
          userId,
          branchId,
        },
      },
    });

    if (existingMembership) {
      if (existingMembership.isActive) {
        return NextResponse.json(
          { error: 'You are already a member of this branch' },
          { status: 400 }
        );
      } else {
        // Reactivate membership
        await db.branchMember.update({
          where: { id: existingMembership.id },
          data: {
            isActive: true,
            joinedAt: new Date(),
          },
        });
      }
    } else {
      // Create new membership
      await db.branchMember.create({
        data: {
          userId,
          branchId,
          role: 'member',
          isActive: true,
        },
      });
    }

    // Get updated branch info
    const updatedBranch = await db.branch.findUnique({
      where: { id: branchId },
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

    const formattedBranch = {
      id: updatedBranch!.id,
      name: updatedBranch!.name,
      description: updatedBranch!.description,
      location: updatedBranch!.location,
      isPublic: updatedBranch!.isPublic,
      role: 'member',
      memberCount: updatedBranch!._count.members + 1, // +1 for owner
      itemCount: updatedBranch!._count.items,
      joinedAt: new Date(),
      owner: updatedBranch!.owner,
    };

    return NextResponse.json(
      {
        message: 'Successfully joined branch',
        branch: formattedBranch,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error joining branch:', error);
    return NextResponse.json(
      { error: 'Failed to join branch' },
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

    // Check if branch exists
    const branch = await db.branch.findUnique({
      where: { id: branchId },
      select: {
        id: true,
        ownerId: true,
        name: true,
      },
    });

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    // Owners cannot leave their own branch
    if (branch.ownerId === userId) {
      return NextResponse.json(
        {
          error:
            'Branch owners cannot leave their own branch. Transfer ownership or delete the branch instead.',
        },
        { status: 400 }
      );
    }

    // Find and deactivate membership
    const membership = await db.branchMember.findUnique({
      where: {
        userId_branchId: {
          userId,
          branchId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this branch' },
        { status: 400 }
      );
    }

    if (!membership.isActive) {
      return NextResponse.json(
        { error: 'You have already left this branch' },
        { status: 400 }
      );
    }

    // TODO: Check if user has active borrows in this branch
    // For now, we'll allow leaving but in production you'd want to:
    // 1. Check for active borrow requests
    // 2. Check for items being borrowed from this user
    // 3. Require resolution before leaving

    // Deactivate membership
    await db.branchMember.update({
      where: { id: membership.id },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({ message: 'Successfully left branch' });
  } catch (error) {
    console.error('Error leaving branch:', error);
    return NextResponse.json(
      { error: 'Failed to leave branch' },
      { status: 500 }
    );
  }
}

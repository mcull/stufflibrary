import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id: collectionId, memberId } = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id!;

    // Check if user has permission to remove members
    const collection = await db.collection.findFirst({
      where: {
        id: collectionId,
        OR: [
          { ownerId: userId }, // Owner
          {
            members: {
              some: {
                userId: userId,
                role: 'admin',
                isActive: true,
              },
            },
          }, // Admin member
        ],
      },
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found or insufficient permissions' },
        { status: 403 }
      );
    }

    // Get the member to be removed
    const memberToRemove = await db.collectionMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!memberToRemove || memberToRemove.collectionId !== collectionId) {
      return NextResponse.json(
        { error: 'Member not found in this collection' },
        { status: 404 }
      );
    }

    // Check permissions: owners can remove anyone except other owners, admins can only remove regular members
    const isOwner = collection.ownerId === userId;
    const currentUserMember = await db.collectionMember.findFirst({
      where: {
        collectionId,
        userId,
        isActive: true,
      },
    });

    if (!isOwner) {
      // If user is admin, they can only remove regular members (not admins or owners)
      if (
        currentUserMember?.role !== 'admin' ||
        memberToRemove.role !== 'member'
      ) {
        return NextResponse.json(
          { error: 'Insufficient permissions to remove this member' },
          { status: 403 }
        );
      }
    } else {
      // Owner cannot remove other owners (if there were multiple owners)
      if (memberToRemove.role === 'owner') {
        return NextResponse.json(
          { error: 'Cannot remove collection owner' },
          { status: 403 }
        );
      }
    }

    // Cannot remove yourself
    if (memberToRemove.userId === userId) {
      return NextResponse.json(
        { error: 'Cannot remove yourself from the collection' },
        { status: 400 }
      );
    }

    // Remove the member (soft delete by setting isActive to false)
    await db.collectionMember.update({
      where: { id: memberId },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${memberToRemove.user.name || memberToRemove.user.email} has been removed from the collection`,
    });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id: collectionId, memberId } = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id!;
    const { role } = await request.json();

    if (!['admin', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Allowed roles: admin, member' },
        { status: 400 }
      );
    }

    // Ensure current user is the owner (only owners can change roles)
    const collection = await db.collection.findUnique({
      where: { id: collectionId },
      select: { ownerId: true },
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    if (collection.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Only library owners can change member roles' },
        { status: 403 }
      );
    }

    // Get target membership and validate it belongs to this collection
    const membership = await db.collectionMember.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        userId: true,
        collectionId: true,
        role: true,
        isActive: true,
      },
    });

    if (!membership || membership.collectionId !== collectionId) {
      return NextResponse.json(
        { error: 'Member not found in this collection' },
        { status: 404 }
      );
    }

    // Cannot change your own role
    if (membership.userId === userId) {
      return NextResponse.json(
        { error: 'Owners cannot change their own role' },
        { status: 400 }
      );
    }

    // Update role
    await db.collectionMember.update({
      where: { id: memberId },
      data: { role },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json(
      { error: 'Failed to update member role' },
      { status: 500 }
    );
  }
}

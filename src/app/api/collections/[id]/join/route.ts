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

    const { id: collectionId } = await params;

    // Check if collection exists and is joinable
    const collection = await db.collection.findUnique({
      where: { id: collectionId },
      select: {
        id: true,
        name: true,
        isPublic: true,
        ownerId: true,
      },
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Check if user is already the owner
    if (collection.ownerId === userId) {
      return NextResponse.json(
        { error: 'You are already the owner of this collection' },
        { status: 400 }
      );
    }

    // Allow join if collection is public OR a valid invite cookie is present
    const inviteToken = request.cookies.get('invite_token')?.value;
    const inviteLibrary = request.cookies.get('invite_library')?.value;
    let inviteOk = false;
    if (inviteToken && inviteLibrary === collectionId) {
      const inv = await db.invitation.findFirst({
        where: {
          token: inviteToken,
          libraryId: collectionId,
          type: 'library',
          status: { in: ['PENDING', 'SENT'] },
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });
      inviteOk = !!inv;
    }
    if (!collection.isPublic && !inviteOk) {
      return NextResponse.json(
        { error: 'This collection is private and requires an invitation' },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const existingMembership = await db.collectionMember.findUnique({
      where: {
        userId_collectionId: {
          userId,
          collectionId,
        },
      },
    });

    if (existingMembership) {
      if (existingMembership.isActive) {
        return NextResponse.json(
          { error: 'You are already a member of this collection' },
          { status: 400 }
        );
      } else {
        // Reactivate membership
        await db.collectionMember.update({
          where: { id: existingMembership.id },
          data: {
            isActive: true,
            joinedAt: new Date(),
          },
        });
      }
    } else {
      // Create new membership
      await db.collectionMember.create({
        data: {
          userId,
          collectionId,
          role: 'member',
          isActive: true,
        },
      });
    }

    // If joined via invite cookie, mark invitation accepted
    if (inviteOk && inviteToken) {
      await db.invitation.updateMany({
        where: { token: inviteToken, libraryId: collectionId },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          receiverId: userId,
        },
      });
    }

    // Get updated collection info
    const updatedCollection = await db.collection.findUnique({
      where: { id: collectionId },
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

    const formattedCollection = {
      id: updatedCollection!.id,
      name: updatedCollection!.name,
      description: updatedCollection!.description,
      location: updatedCollection!.location,
      isPublic: updatedCollection!.isPublic,
      role: 'member',
      memberCount: updatedCollection!._count.members + 1, // +1 for owner
      itemCount: updatedCollection!._count.items,
      joinedAt: new Date(),
      owner: updatedCollection!.owner,
    };

    const res = NextResponse.json(
      {
        message: 'Successfully joined collection',
        collection: formattedCollection,
      },
      { status: 201 }
    );
    // Clear invite cookies after join
    res.cookies.set('invite_token', '', { path: '/', maxAge: 0 });
    res.cookies.set('invite_library', '', { path: '/', maxAge: 0 });
    return res;
  } catch (error) {
    console.error('Error joining collection:', error);
    return NextResponse.json(
      { error: 'Failed to join collection' },
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

    const { id: collectionId } = await params;

    // Check if collection exists
    const collection = await db.collection.findUnique({
      where: { id: collectionId },
      select: {
        id: true,
        ownerId: true,
        name: true,
      },
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Owners cannot leave their own collection
    if (collection.ownerId === userId) {
      return NextResponse.json(
        {
          error:
            'Collection owners cannot leave their own collection. Transfer ownership or delete the collection instead.',
        },
        { status: 400 }
      );
    }

    // Find and deactivate membership
    const membership = await db.collectionMember.findUnique({
      where: {
        userId_collectionId: {
          userId,
          collectionId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this collection' },
        { status: 400 }
      );
    }

    if (!membership.isActive) {
      return NextResponse.json(
        { error: 'You have already left this collection' },
        { status: 400 }
      );
    }

    // TODO: Check if user has active borrows in this collection
    // For now, we'll allow leaving but in production you'd want to:
    // 1. Check for active borrow requests
    // 2. Check for items being borrowed from this user
    // 3. Require resolution before leaving

    // Deactivate membership
    await db.collectionMember.update({
      where: { id: membership.id },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({ message: 'Successfully left collection' });
  } catch (error) {
    console.error('Error leaving collection:', error);
    return NextResponse.json(
      { error: 'Failed to leave collection' },
      { status: 500 }
    );
  }
}

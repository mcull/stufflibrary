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

    const { id: libraryId } = await params;

    // Check if library exists and is joinable
    const library = await db.library.findUnique({
      where: { id: libraryId },
      select: {
        id: true,
        name: true,
        isPublic: true,
        ownerId: true,
      },
    });

    if (!library) {
      return NextResponse.json({ error: 'Library not found' }, { status: 404 });
    }

    // Check if user is already the owner
    if (library.ownerId === userId) {
      return NextResponse.json(
        { error: 'You are already the owner of this library' },
        { status: 400 }
      );
    }

    // For now, only allow joining public libraries
    // TODO: Add invitation system for private libraries
    if (!library.isPublic) {
      return NextResponse.json(
        { error: 'This library is private and requires an invitation' },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const existingMembership = await db.libraryMember.findUnique({
      where: {
        userId_libraryId: {
          userId,
          libraryId,
        },
      },
    });

    if (existingMembership) {
      if (existingMembership.isActive) {
        return NextResponse.json(
          { error: 'You are already a member of this library' },
          { status: 400 }
        );
      } else {
        // Reactivate membership
        await db.libraryMember.update({
          where: { id: existingMembership.id },
          data: {
            isActive: true,
            joinedAt: new Date(),
          },
        });
      }
    } else {
      // Create new membership
      await db.libraryMember.create({
        data: {
          userId,
          libraryId,
          role: 'member',
          isActive: true,
        },
      });
    }

    // Get updated library info
    const updatedLibrary = await db.library.findUnique({
      where: { id: libraryId },
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

    const formattedLibrary = {
      id: updatedLibrary!.id,
      name: updatedLibrary!.name,
      description: updatedLibrary!.description,
      location: updatedLibrary!.location,
      isPublic: updatedLibrary!.isPublic,
      role: 'member',
      memberCount: updatedLibrary!._count.members + 1, // +1 for owner
      itemCount: updatedLibrary!._count.items,
      joinedAt: new Date(),
      owner: updatedLibrary!.owner,
    };

    return NextResponse.json(
      {
        message: 'Successfully joined library',
        library: formattedLibrary,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error joining library:', error);
    return NextResponse.json(
      { error: 'Failed to join library' },
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

    // Check if library exists
    const library = await db.library.findUnique({
      where: { id: libraryId },
      select: {
        id: true,
        ownerId: true,
        name: true,
      },
    });

    if (!library) {
      return NextResponse.json({ error: 'Library not found' }, { status: 404 });
    }

    // Owners cannot leave their own library
    if (library.ownerId === userId) {
      return NextResponse.json(
        {
          error:
            'Library owners cannot leave their own library. Transfer ownership or delete the library instead.',
        },
        { status: 400 }
      );
    }

    // Find and deactivate membership
    const membership = await db.libraryMember.findUnique({
      where: {
        userId_libraryId: {
          userId,
          libraryId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this library' },
        { status: 400 }
      );
    }

    if (!membership.isActive) {
      return NextResponse.json(
        { error: 'You have already left this library' },
        { status: 400 }
      );
    }

    // TODO: Check if user has active borrows in this library
    // For now, we'll allow leaving but in production you'd want to:
    // 1. Check for active borrow requests
    // 2. Check for items being borrowed from this user
    // 3. Require resolution before leaving

    // Deactivate membership
    await db.libraryMember.update({
      where: { id: membership.id },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({ message: 'Successfully left library' });
  } catch (error) {
    console.error('Error leaving library:', error);
    return NextResponse.json(
      { error: 'Failed to leave library' },
      { status: 500 }
    );
  }
}

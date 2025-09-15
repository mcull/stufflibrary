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

    const userId = (session.user as { id?: string }).id;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const { id: collectionId } = await params;

    // Check if user is the owner
    const collection = await db.collection.findUnique({
      where: { id: collectionId },
      select: {
        id: true,
        name: true,
        ownerId: true,
        isArchived: true,
      },
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    if (collection.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Only collection owners can archive collections' },
        { status: 403 }
      );
    }

    if (collection.isArchived) {
      return NextResponse.json(
        { error: 'Collection is already archived' },
        { status: 400 }
      );
    }

    // Archive the collection
    const archivedCollection = await db.collection.update({
      where: { id: collectionId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        isArchived: true,
        archivedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Collection "${collection.name}" has been archived`,
      collection: archivedCollection,
    });
  } catch (error) {
    console.error('Error archiving collection:', error);
    return NextResponse.json(
      { error: 'Failed to archive collection' },
      { status: 500 }
    );
  }
}

// Unarchive endpoint
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const { id: collectionId } = await params;

    // Check if user is the owner
    const collection = await db.collection.findUnique({
      where: { id: collectionId },
      select: {
        id: true,
        name: true,
        ownerId: true,
        isArchived: true,
      },
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    if (collection.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Only collection owners can unarchive collections' },
        { status: 403 }
      );
    }

    if (!collection.isArchived) {
      return NextResponse.json(
        { error: 'Collection is not archived' },
        { status: 400 }
      );
    }

    // Unarchive the collection
    const unarchivedCollection = await db.collection.update({
      where: { id: collectionId },
      data: {
        isArchived: false,
        archivedAt: null,
      },
      select: {
        id: true,
        name: true,
        isArchived: true,
        archivedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Collection "${collection.name}" has been unarchived`,
      collection: unarchivedCollection,
    });
  } catch (error) {
    console.error('Error unarchiving collection:', error);
    return NextResponse.json(
      { error: 'Failed to unarchive collection' },
      { status: 500 }
    );
  }
}

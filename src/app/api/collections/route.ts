import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID (support multiple session shapes) and fallback by email
    let userId =
      (session.user as any).id ||
      (session as any).user?.id ||
      (session as any).userId ||
      null;

    if (!userId && session.user?.email) {
      const userByEmail = await db.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      userId = userByEmail?.id || null;
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    // Safety net: ensure accepted invitations are reflected as active memberships
    try {
      const accepted = await db.invitation.findMany({
        where: {
          receiverId: userId,
          status: 'ACCEPTED',
          libraryId: { not: null },
        },
        select: { libraryId: true },
      });
      if (accepted.length > 0) {
        const libIds = Array.from(new Set(accepted.map((a) => a.libraryId!)));
        const existing = await db.collectionMember.findMany({
          where: { userId, collectionId: { in: libIds } },
          select: { collectionId: true },
        });
        const existingSet = new Set(existing.map((m) => m.collectionId));
        const toCreate = libIds.filter((id) => !existingSet.has(id));
        if (toCreate.length > 0) {
          await db.$transaction(
            toCreate.map((collectionId) =>
              db.collectionMember.create({
                data: { userId, collectionId, role: 'member', isActive: true },
              })
            )
          );
        }
      }
    } catch (e) {
      console.warn('Membership sync skipped:', e);
    }

    // Get owned collections directly
    const owned = await db.collection.findMany({
      where: { ownerId: userId, isArchived: false },
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        isPublic: true,
        createdAt: true,
        members: {
          select: {
            id: true,
            role: true,
            user: { select: { id: true, name: true, image: true } },
          },
        },
        _count: {
          select: {
            members: true,
            items: { where: { item: { currentBorrowRequestId: null } } },
          },
        },
      },
    });

    // Get member collections via memberships
    const memberships = await db.collectionMember.findMany({
      where: {
        userId,
        isActive: true,
        collection: {
          isArchived: false,
          owner: { status: 'active' },
        },
      },
      select: {
        role: true,
        joinedAt: true,
        collection: {
          select: {
            id: true,
            name: true,
            description: true,
            location: true,
            isPublic: true,
            createdAt: true,
            owner: {
              select: { id: true, name: true, image: true, status: true },
            },
            _count: {
              select: {
                members: true,
                items: { where: { item: { currentBorrowRequestId: null } } },
              },
            },
          },
        },
      },
    });

    const collections = [
      ...owned.map((library) => ({
        id: library.id,
        name: library.name,
        description: library.description,
        location: library.location,
        isPublic: library.isPublic,
        role: 'owner' as const,
        memberCount: library._count.members + 1,
        itemCount: library._count.items,
        joinedAt: library.createdAt,
        owner: {
          id: userId,
          name: session.user?.name || null,
          image: session.user?.image || null,
        },
        members: library.members,
      })),
      ...memberships.map((m) => ({
        id: m.collection.id,
        name: m.collection.name,
        description: m.collection.description,
        location: m.collection.location,
        isPublic: m.collection.isPublic,
        role: m.role,
        memberCount: m.collection._count.members + 1,
        itemCount: m.collection._count.items,
        joinedAt: m.joinedAt,
        owner: m.collection.owner,
      })),
    ];

    return NextResponse.json({ collections });
  } catch (error) {
    console.error('Error fetching collections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID (support multiple session shapes)
    const userId =
      (session.user as any).id ||
      (session as any).user?.id ||
      (session as any).userId;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, location, isPublic = false } = body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Collection name is required' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Collection name must be 100 characters or less' },
        { status: 400 }
      );
    }

    // Create the collection
    const library = await db.collection.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        location: location?.trim() || null,
        isPublic: Boolean(isPublic),
        ownerId: userId,
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
    const formattedLibrary = {
      id: library.id,
      name: library.name,
      description: library.description,
      location: library.location,
      isPublic: library.isPublic,
      role: 'owner',
      memberCount: 1, // Just the owner
      itemCount: 0,
      joinedAt: library.createdAt,
      owner: library.owner,
      createdAt: library.createdAt,
    };

    return NextResponse.json({ collection: formattedLibrary }, { status: 201 });
  } catch (error) {
    console.error('Error creating collection:', error);
    return NextResponse.json(
      { error: 'Failed to create collection' },
      { status: 500 }
    );
  }
}

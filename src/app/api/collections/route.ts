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

    // Get user ID
    const userId = (session.user as { id?: string }).id;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    // Get user's collections (both owned and member)
    const userLibraries = await db.user.findUnique({
      where: { id: userId },
      select: {
        ownedCollections: {
          where: {
            isArchived: false,
          },
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
                user: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
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
        },
        collectionMemberships: {
          where: {
            isActive: true,
            collection: {
              isArchived: false,
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
            },
          },
        },
      },
    });

    if (!userLibraries) {
      return NextResponse.json({ collections: [] });
    }

    // Format the response
    const collections = [
      // Owned collections
      ...userLibraries.ownedCollections.map((library) => ({
        id: library.id,
        name: library.name,
        description: library.description,
        location: library.location,
        isPublic: library.isPublic,
        role: 'owner',
        memberCount: library._count.members + 1, // +1 for owner
        itemCount: library._count.items,
        joinedAt: library.createdAt,
        owner: {
          id: userId,
          name: session.user?.name || null,
          image: session.user?.image || null,
        },
        members: library.members,
      })),
      // Member collections
      ...userLibraries.collectionMemberships.map((membership) => ({
        id: membership.collection.id,
        name: membership.collection.name,
        description: membership.collection.description,
        location: membership.collection.location,
        isPublic: membership.collection.isPublic,
        role: membership.role,
        memberCount: membership.collection._count.members + 1, // +1 for owner
        itemCount: membership.collection._count.items,
        joinedAt: membership.joinedAt,
        owner: membership.collection.owner,
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

    // Get user ID
    const userId = (session.user as { id?: string }).id;

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

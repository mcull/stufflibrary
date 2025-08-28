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
    const userId =
      (session.user as any).id ||
      (session as any).user?.id ||
      (session as any).userId;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    // Get user's libraries (both owned and member)
    const userLibraries = await db.user.findUnique({
      where: { id: userId },
      select: {
        ownedLibraries: {
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
                items: true,
              },
            },
          },
        },
        libraryMemberships: {
          where: { isActive: true },
          select: {
            role: true,
            joinedAt: true,
            library: {
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
                    items: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!userLibraries) {
      return NextResponse.json({ libraries: [] });
    }

    // Format the response
    const libraries = [
      // Owned libraries
      ...userLibraries.ownedLibraries.map((library) => ({
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
      // Member libraries
      ...userLibraries.libraryMemberships.map((membership) => ({
        id: membership.library.id,
        name: membership.library.name,
        description: membership.library.description,
        location: membership.library.location,
        isPublic: membership.library.isPublic,
        role: membership.role,
        memberCount: membership.library._count.members + 1, // +1 for owner
        itemCount: membership.library._count.items,
        joinedAt: membership.joinedAt,
        owner: membership.library.owner,
      })),
    ];

    return NextResponse.json({ libraries });
  } catch (error) {
    console.error('Error fetching libraries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch libraries' },
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
        { error: 'Library name is required' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Library name must be 100 characters or less' },
        { status: 400 }
      );
    }

    // Create the library
    const library = await db.library.create({
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

    return NextResponse.json({ library: formattedLibrary }, { status: 201 });
  } catch (error) {
    console.error('Error creating library:', error);
    return NextResponse.json(
      { error: 'Failed to create library' },
      { status: 500 }
    );
  }
}

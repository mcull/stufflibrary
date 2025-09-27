import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID
    const userId =
      (session.user as { id?: string }).id ||
      (session as { user?: { id?: string }; userId?: string }).user?.id ||
      (session as { user?: { id?: string }; userId?: string }).userId;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();

    // Build search conditions
    const whereClause: {
      isPublic: boolean;
      owner: { status: string };
      AND: Array<{
        ownerId?: { not: string };
        members?: { none: { userId: string; isActive: boolean } };
      }>;
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        description?: { contains: string; mode: 'insensitive' };
        location?: { contains: string; mode: 'insensitive' };
      }>;
    } = {
      isPublic: true,
      // Only show libraries owned by active users
      owner: { status: 'active' },
      // Exclude libraries the user is already a member of
      AND: [
        {
          ownerId: {
            not: userId,
          },
        },
        {
          members: {
            none: {
              userId: userId,
              isActive: true,
            },
          },
        },
      ],
    };

    // Add search conditions if provided
    if (search) {
      whereClause.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          location: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Get public libraries that the user isn't already a member of
    const publicLibraries = await db.collection.findMany({
      where: whereClause,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
            status: true,
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
      orderBy: [
        { createdAt: 'desc' }, // Newest first
      ],
      take: 20, // Limit results
    });

    // Format the response
    const libraries = publicLibraries.map((library) => ({
      id: library.id,
      name: library.name,
      description: library.description,
      location: library.location,
      memberCount: (library as any)._count?.members + 1 || 1, // +1 for owner
      itemCount: (library as any)._count?.items || 0,
      owner: (library as any).owner || null,
      createdAt: library.createdAt,
    }));

    return NextResponse.json({ libraries });
  } catch (error) {
    console.error('Error fetching public libraries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch public libraries' },
      { status: 500 }
    );
  }
}

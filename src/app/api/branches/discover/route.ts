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
      // Exclude branches the user is already a member of
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

    // Get public branches that the user isn't already a member of
    const publicBranches = await db.branch.findMany({
      where: whereClause,
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
      orderBy: [
        { createdAt: 'desc' }, // Newest first
      ],
      take: 20, // Limit results
    });

    // Format the response
    const branches = publicBranches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      description: branch.description,
      location: branch.location,
      memberCount: branch._count.members + 1, // +1 for owner
      itemCount: branch._count.items,
      owner: branch.owner,
      createdAt: branch.createdAt,
    }));

    return NextResponse.json({ branches });
  } catch (error) {
    console.error('Error fetching public branches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch public libraries' },
      { status: 500 }
    );
  }
}

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

    // Get user's branches (both owned and member)
    const userBranches = await db.user.findUnique({
      where: { id: userId },
      select: {
        ownedBranches: {
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
        branchMemberships: {
          where: { isActive: true },
          select: {
            role: true,
            joinedAt: true,
            branch: {
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

    if (!userBranches) {
      return NextResponse.json({ branches: [] });
    }

    // Format the response
    const branches = [
      // Owned branches
      ...userBranches.ownedBranches.map((branch) => ({
        id: branch.id,
        name: branch.name,
        description: branch.description,
        location: branch.location,
        isPublic: branch.isPublic,
        role: 'owner',
        memberCount: branch._count.members + 1, // +1 for owner
        itemCount: branch._count.items,
        joinedAt: branch.createdAt,
        owner: {
          id: userId,
          name: session.user?.name || null,
          image: session.user?.image || null,
        },
        members: branch.members,
      })),
      // Member branches
      ...userBranches.branchMemberships.map((membership) => ({
        id: membership.branch.id,
        name: membership.branch.name,
        description: membership.branch.description,
        location: membership.branch.location,
        isPublic: membership.branch.isPublic,
        role: membership.role,
        memberCount: membership.branch._count.members + 1, // +1 for owner
        itemCount: membership.branch._count.items,
        joinedAt: membership.joinedAt,
        owner: membership.branch.owner,
      })),
    ];

    return NextResponse.json({ branches });
  } catch (error) {
    console.error('Error fetching branches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch branches' },
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
        { error: 'Branch name is required' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Branch name must be 100 characters or less' },
        { status: 400 }
      );
    }

    // Create the branch
    const branch = await db.branch.create({
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
    const formattedBranch = {
      id: branch.id,
      name: branch.name,
      description: branch.description,
      location: branch.location,
      isPublic: branch.isPublic,
      role: 'owner',
      memberCount: 1, // Just the owner
      itemCount: 0,
      joinedAt: branch.createdAt,
      owner: branch.owner,
      createdAt: branch.createdAt,
    };

    return NextResponse.json({ branch: formattedBranch }, { status: 201 });
  } catch (error) {
    console.error('Error creating branch:', error);
    return NextResponse.json(
      { error: 'Failed to create branch' },
      { status: 500 }
    );
  }
}

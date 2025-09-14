import { NextRequest, NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const isPublic = searchParams.get('isPublic');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { owner: { name: { contains: search, mode: 'insensitive' } } },
        { owner: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (isPublic !== null) {
      where.isPublic = isPublic === 'true';
    }

    // Get total count
    const total = await db.library.count({ where });

    // Get libraries with relations
    const libraries = await db.library.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            items: true,
            invitations: true,
          },
        },
      },
    });

    // Enrich libraries with computed fields
    const enrichedLibraries = libraries.map((library) => ({
      ...library,
      totalMembers: library._count.members + 1, // +1 for owner
      totalItems: library._count.items,
      totalInvitations: library._count.invitations,
      activeMembers: library.members.filter((m) => m.isActive).length + 1, // +1 for owner
    }));

    return NextResponse.json({
      libraries: enrichedLibraries,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin libraries fetch error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to fetch libraries',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdminAuth();

    const { libraryIds, action, data } = await request.json();

    if (!libraryIds || !Array.isArray(libraryIds) || libraryIds.length === 0) {
      return NextResponse.json(
        { error: 'Library IDs are required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'delete':
        result = await db.library.deleteMany({
          where: { id: { in: libraryIds } },
        });
        break;

      case 'togglePublic':
        // Toggle public status for each library individually
        const libraries = await db.library.findMany({
          where: { id: { in: libraryIds } },
          select: { id: true, isPublic: true },
        });

        const updatePromises = libraries.map((lib) =>
          db.library.update({
            where: { id: lib.id },
            data: { isPublic: !lib.isPublic },
          })
        );

        await Promise.all(updatePromises);
        result = { count: libraries.length };
        break;

      case 'updateVisibility':
        if (data?.isPublic === undefined) {
          return NextResponse.json(
            { error: 'isPublic value is required for updateVisibility action' },
            { status: 400 }
          );
        }
        result = await db.library.updateMany({
          where: { id: { in: libraryIds } },
          data: { isPublic: data.isPublic },
        });
        break;

      default:
        return NextResponse.json(
          {
            error:
              'Invalid action. Supported actions: delete, togglePublic, updateVisibility',
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      affected: result.count,
      action,
    });
  } catch (error) {
    console.error('Admin libraries bulk operation error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Bulk operation failed',
      },
      { status: 500 }
    );
  }
}

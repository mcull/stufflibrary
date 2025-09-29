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
    const total = await db.collection.count({ where });

    // Get collections with relations
    const collections = await db.collection.findMany({
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
            members: { where: { isActive: true, user: { status: 'active' } } },
            items: true,
            invitations: true,
          },
        },
      },
    });

    // Enrich collections with computed fields
    const enrichedCollections = collections.map((collection) => ({
      ...collection,
      totalMembers: collection._count.members + 1, // +1 for owner
      totalItems: collection._count.items,
      totalInvitations: collection._count.invitations,
      activeMembers: collection.members.filter((m) => m.isActive).length + 1, // +1 for owner
    }));

    return NextResponse.json({
      collections: enrichedCollections,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin collections fetch error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch collections',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdminAuth();

    const { collectionIds, action, data } = await request.json();

    if (
      !collectionIds ||
      !Array.isArray(collectionIds) ||
      collectionIds.length === 0
    ) {
      return NextResponse.json(
        { error: 'Collection IDs are required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'delete':
        result = await db.collection.deleteMany({
          where: { id: { in: collectionIds } },
        });
        break;

      case 'togglePublic':
        // Toggle public status for each collection individually
        const collections = await db.collection.findMany({
          where: { id: { in: collectionIds } },
          select: { id: true, isPublic: true },
        });

        const updatePromises = collections.map((collection) =>
          db.collection.update({
            where: { id: collection.id },
            data: { isPublic: !collection.isPublic },
          })
        );

        await Promise.all(updatePromises);
        result = { count: collections.length };
        break;

      case 'updateVisibility':
        if (data?.isPublic === undefined) {
          return NextResponse.json(
            { error: 'isPublic value is required for updateVisibility action' },
            { status: 400 }
          );
        }
        result = await db.collection.updateMany({
          where: { id: { in: collectionIds } },
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
    console.error('Admin collections bulk operation error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Bulk operation failed',
      },
      { status: 500 }
    );
  }
}

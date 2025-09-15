import { NextRequest, NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const condition = searchParams.get('condition') || '';
    const status = searchParams.get('status') || '';
    // const flagged = searchParams.get('flagged') === 'true'; // TODO: Implement content flagging
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { owner: { name: { contains: search, mode: 'insensitive' } } },
        { owner: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (condition) {
      where.condition = condition;
    }

    if (status === 'available') {
      where.currentBorrowRequestId = null;
    } else if (status === 'borrowed') {
      where.currentBorrowRequestId = { not: null };
    }

    // Get total count
    const total = await db.item.count({ where });

    // Get items with relations
    const items = await db.item.findMany({
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
        stuffType: {
          select: {
            displayName: true,
            category: true,
            iconPath: true,
          },
        },
        collections: {
          include: {
            collection: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        borrowRequests: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          where: { status: 'ACTIVE' },
          include: {
            borrower: {
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
            borrowRequests: true,
          },
        },
      },
    });

    // Enrich items with computed fields
    const enrichedItems = items.map((item) => ({
      ...item,
      isAvailable: !item.currentBorrowRequestId,
      currentBorrower: item.borrowRequests[0]?.borrower || null,
      totalBorrowRequests: item._count.borrowRequests,
      libraries: item.collections.map((ic) => ic.collection),
    }));

    return NextResponse.json({
      items: enrichedItems,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin items fetch error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch items',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdminAuth();

    const { itemIds, action, data } = await request.json();

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: 'Item IDs are required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'delete':
        result = await db.item.deleteMany({
          where: { id: { in: itemIds } },
        });
        break;

      case 'updateCondition':
        if (!data?.condition) {
          return NextResponse.json(
            { error: 'Condition is required for updateCondition action' },
            { status: 400 }
          );
        }
        result = await db.item.updateMany({
          where: { id: { in: itemIds } },
          data: { condition: data.condition },
        });
        break;

      case 'updateCategory':
        if (!data?.category) {
          return NextResponse.json(
            { error: 'Category is required for updateCategory action' },
            { status: 400 }
          );
        }
        result = await db.item.updateMany({
          where: { id: { in: itemIds } },
          data: { category: data.category },
        });
        break;

      default:
        return NextResponse.json(
          {
            error:
              'Invalid action. Supported actions: delete, updateCondition, updateCategory',
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
    console.error('Admin items bulk operation error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Bulk operation failed',
      },
      { status: 500 }
    );
  }
}

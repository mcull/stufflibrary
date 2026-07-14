import { NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    await requireAdminAuth();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const profileCompleted = searchParams.get('profileCompleted') || '';
    const joinedAfter = searchParams.get('joinedAfter');
    const joinedBefore = searchParams.get('joinedBefore');
    const ownersOnly = searchParams.get('ownersOnly') === 'true';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Profile completion filter
    if (profileCompleted) {
      where.profileCompleted = profileCompleted === 'true';
    }

    // Owners filter (owns ≥1 library) — a real where clause so the
    // pagination totalCount stays consistent with the page contents
    if (ownersOnly) {
      where.ownedCollections = { some: {} };
    }

    // Date range filters
    if (joinedAfter || joinedBefore) {
      where.createdAt = {};
      if (joinedAfter) {
        where.createdAt.gte = new Date(joinedAfter);
      }
      if (joinedBefore) {
        where.createdAt.lte = new Date(joinedBefore);
      }
    }

    // The roster's facts and nothing more — no PII the screen never shows,
    // no per-user take-5 subqueries. (Detail lives at /users/[userId]/details.)
    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        profileCompleted: true,
        phoneVerified: true,
        trustScore: true,
        trustTier: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            items: true,
            borrowRequests: true,
            addresses: true,
            ownedCollections: true,
          },
        },
        // First membership = home library (same pattern as the circulation ledger)
        collectionMemberships: {
          orderBy: { joinedAt: 'asc' },
          take: 1,
          select: { collection: { select: { name: true } } },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: offset,
      take: limit,
    });

    // Get total count for pagination
    const totalCount = await db.user.count({ where });

    return NextResponse.json({
      users,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Admin users fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Access denied' },
      { status: 401 }
    );
  }
}

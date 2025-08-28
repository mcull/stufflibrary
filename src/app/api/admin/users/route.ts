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
    const activityLevel = searchParams.get('activityLevel') || '';
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

    // Get users with comprehensive data
    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        profileCompleted: true,
        phone: true,
        phoneVerified: true,
        bio: true,
        shareInterests: true,
        borrowInterests: true,
        movedInDate: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            items: true,
            borrowRequests: true,
            addresses: true,
          },
        },
        borrowRequests: {
          select: {
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        items: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: offset,
      take: limit,
    });

    // Calculate activity levels and trust scores
    const enrichedUsers = users.map((user) => {
      const recentActivity = user.borrowRequests.filter(
        (req) =>
          new Date(req.createdAt) >
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length;

      const totalItems = user._count.items;
      const totalRequests = user._count.borrowRequests;

      // Simple activity level calculation
      let activityLevel = 'low';
      if (recentActivity > 5 || totalRequests > 10) {
        activityLevel = 'high';
      } else if (recentActivity > 2 || totalRequests > 5) {
        activityLevel = 'medium';
      }

      // Simple trust score calculation
      const profileScore = user.profileCompleted ? 25 : 0;
      const phoneScore = user.phoneVerified ? 25 : 0;
      const itemsScore = Math.min(totalItems * 5, 25);
      const activityScore = Math.min(totalRequests * 2, 25);
      const trustScore = profileScore + phoneScore + itemsScore + activityScore;

      return {
        ...user,
        activityLevel,
        trustScore,
        recentActivity,
      };
    });

    // Filter by activity level if specified
    const filteredUsers = activityLevel
      ? enrichedUsers.filter((user) => user.activityLevel === activityLevel)
      : enrichedUsers;

    // Get total count for pagination
    const totalCount = await db.user.count({ where });

    return NextResponse.json({
      users: filteredUsers,
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

import { NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { RedisService } from '@/lib/redis';

export async function GET(request: Request) {
  try {
    await requireAdminAuth();

    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric') || 'users';

    // Generate cache key
    const cacheKey = `analytics:geographic:${metric}`;

    // Try to get cached data
    try {
      const cachedData = await RedisService.get(cacheKey);
      if (cachedData) {
        return NextResponse.json(cachedData);
      }
    } catch (error) {
      console.warn('Redis get error, proceeding without cache:', error);
    }

    let data: unknown[] = [];

    switch (metric) {
      case 'users':
        data = (await getUserGeographicData()) as unknown[];
        break;
      case 'items':
        data = (await getItemGeographicData()) as unknown[];
        break;
      case 'libraries':
        data = (await getLibraryGeographicData()) as unknown[];
        break;
      case 'activity':
        data = (await getActivityGeographicData()) as unknown[];
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid metric specified' },
          { status: 400 }
        );
    }

    const responseData = {
      data,
      metric,
    };

    // Cache the data for 15 minutes
    try {
      await RedisService.set(cacheKey, responseData, { ex: 900 });
    } catch (error) {
      console.warn('Redis set error, proceeding without caching:', error);
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Analytics geographic fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Access denied' },
      { status: 401 }
    );
  }
}

async function getUserGeographicData() {
  const result = await db.$queryRaw`
    SELECT 
      a.city,
      a.state,
      a.country,
      a.latitude,
      a.longitude,
      COUNT(DISTINCT u.id) as user_count,
      COUNT(CASE WHEN u.status = 'active' THEN 1 END) as active_users,
      AVG(u."trustScore") as avg_trust_score
    FROM addresses a
    INNER JOIN users u ON u."currentAddressId" = a.id
    WHERE a.latitude IS NOT NULL AND a.longitude IS NOT NULL
    GROUP BY a.city, a.state, a.country, a.latitude, a.longitude
    ORDER BY user_count DESC
  `;

  return result;
}

async function getItemGeographicData() {
  const result = await db.$queryRaw`
    SELECT 
      a.city,
      a.state,
      a.country,
      a.latitude,
      a.longitude,
      COUNT(DISTINCT i.id) as item_count,
      COUNT(DISTINCT i.category) as unique_categories,
      COUNT(CASE WHEN i."currentBorrowRequestId" IS NOT NULL THEN 1 END) as borrowed_items
    FROM addresses a
    INNER JOIN users u ON u."currentAddressId" = a.id
    INNER JOIN items i ON i."ownerId" = u.id
    WHERE a.latitude IS NOT NULL AND a.longitude IS NOT NULL
    GROUP BY a.city, a.state, a.country, a.latitude, a.longitude
    ORDER BY item_count DESC
  `;

  return result;
}

async function getLibraryGeographicData() {
  const result = await db.$queryRaw`
    SELECT 
      a.city,
      a.state,
      a.country,
      a.latitude,
      a.longitude,
      COUNT(DISTINCT l.id) as library_count,
      COUNT(CASE WHEN l."isPublic" = true THEN 1 END) as public_libraries,
      AVG(member_counts.member_count) as avg_members
    FROM addresses a
    INNER JOIN users u ON u."currentAddressId" = a.id
    INNER JOIN libraries l ON l."ownerId" = u.id
    LEFT JOIN (
      SELECT 
        lm."libraryId",
        COUNT(*) as member_count
      FROM library_members lm
      WHERE lm."isActive" = true
      GROUP BY lm."libraryId"
    ) member_counts ON member_counts."libraryId" = l.id
    WHERE a.latitude IS NOT NULL AND a.longitude IS NOT NULL
    GROUP BY a.city, a.state, a.country, a.latitude, a.longitude
    ORDER BY library_count DESC
  `;

  return result;
}

async function getActivityGeographicData() {
  const result = await db.$queryRaw`
    SELECT 
      a.city,
      a.state,
      a.country,
      a.latitude,
      a.longitude,
      COUNT(DISTINCT br.id) as borrow_requests,
      COUNT(CASE WHEN br.status = 'RETURNED' THEN 1 END) as successful_borrows,
      COUNT(CASE WHEN br.status = 'PENDING' THEN 1 END) as pending_requests,
      COALESCE(
        COUNT(CASE WHEN br.status = 'RETURNED' THEN 1 END)::float / 
        NULLIF(COUNT(CASE WHEN br.status IN ('RETURNED', 'DECLINED') THEN 1 END), 0) * 100,
        0
      ) as success_rate
    FROM addresses a
    INNER JOIN users u ON u."currentAddressId" = a.id
    INNER JOIN borrow_requests br ON (br."borrowerId" = u.id OR br."lenderId" = u.id)
    WHERE a.latitude IS NOT NULL AND a.longitude IS NOT NULL
    GROUP BY a.city, a.state, a.country, a.latitude, a.longitude
    HAVING COUNT(DISTINCT br.id) > 0
    ORDER BY borrow_requests DESC
  `;

  return result;
}

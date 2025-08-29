import { NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { RedisService } from '@/lib/redis';

export async function GET(request: Request) {
  try {
    await requireAdminAuth();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Generate cache key
    const cacheKey = `analytics:engagement:${start.toISOString().split('T')[0]}:${end.toISOString().split('T')[0]}`;

    // Try to get cached data
    try {
      const cachedData = await RedisService.get(cacheKey);
      if (cachedData) {
        return NextResponse.json(cachedData);
      }
    } catch (error) {
      console.warn('Redis get error, proceeding without cache:', error);
    }

    const [
      userEngagement,
      itemPopularity,
      categoryAnalysis,
      borrowSuccessRates,
      userRetention,
      libraryEngagement,
    ] = await Promise.all([
      getUserEngagementScores(start, end),
      getItemPopularityMetrics(start, end),
      getCategoryAnalysis(),
      getBorrowSuccessRates(start, end),
      getUserRetentionMetrics(),
      getLibraryEngagementMetrics(start, end),
    ]);

    const responseData = {
      userEngagement,
      itemPopularity,
      categoryAnalysis,
      borrowSuccessRates,
      userRetention,
      libraryEngagement,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    };

    // Cache the data for 20 minutes (engagement data is expensive)
    try {
      await RedisService.set(cacheKey, responseData, { ex: 1200 });
    } catch (error) {
      console.warn('Redis set error, proceeding without caching:', error);
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Analytics engagement fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Access denied' },
      { status: 401 }
    );
  }
}

async function getUserEngagementScores(start: Date, end: Date) {
  const result = await db.$queryRaw`
    SELECT 
      u.id,
      u.name,
      u.email,
      u."trustScore",
      COUNT(DISTINCT br_borrowed.id) as items_borrowed,
      COUNT(DISTINCT br_lent.id) as items_lent,
      COUNT(DISTINCT lm.id) as libraries_joined,
      COUNT(DISTINCT i.id) as items_shared,
      COUNT(DISTINCT n.id) as notifications_received,
      (
        COUNT(DISTINCT br_borrowed.id) * 1.0 +
        COUNT(DISTINCT br_lent.id) * 1.5 +
        COUNT(DISTINCT lm.id) * 2.0 +
        COUNT(DISTINCT i.id) * 0.5
      ) as engagement_score
    FROM users u
    LEFT JOIN borrow_requests br_borrowed ON br_borrowed."borrowerId" = u.id 
      AND br_borrowed."createdAt" >= ${start} AND br_borrowed."createdAt" <= ${end}
    LEFT JOIN borrow_requests br_lent ON br_lent."lenderId" = u.id 
      AND br_lent."createdAt" >= ${start} AND br_lent."createdAt" <= ${end}
    LEFT JOIN library_members lm ON lm."userId" = u.id 
      AND lm."joinedAt" >= ${start} AND lm."joinedAt" <= ${end}
    LEFT JOIN items i ON i."ownerId" = u.id
    LEFT JOIN notifications n ON n."userId" = u.id 
      AND n."createdAt" >= ${start} AND n."createdAt" <= ${end}
    WHERE u.status = 'active'
    GROUP BY u.id, u.name, u.email, u."trustScore"
    ORDER BY engagement_score DESC
    LIMIT 50
  `;

  return result;
}

async function getItemPopularityMetrics(start: Date, end: Date) {
  const result = await db.$queryRaw`
    SELECT 
      i.id,
      i.name,
      i.category,
      st.name as stuff_type,
      COUNT(DISTINCT br.id) as borrow_requests,
      COUNT(CASE WHEN br.status = 'APPROVED' THEN 1 END) as approved_requests,
      COUNT(CASE WHEN br.status = 'RETURNED' THEN 1 END) as completed_borrows,
      COALESCE(
        COUNT(CASE WHEN br.status = 'APPROVED' THEN 1 END)::float / 
        NULLIF(COUNT(DISTINCT br.id), 0) * 100,
        0
      ) as approval_rate,
      AVG(EXTRACT(EPOCH FROM (br."returnedAt" - br."approvedAt"))/86400) as avg_borrow_duration_days
    FROM items i
    LEFT JOIN borrow_requests br ON br."itemId" = i.id 
      AND br."createdAt" >= ${start} AND br."createdAt" <= ${end}
    LEFT JOIN stuff_types st ON st.id = i."stuffTypeId"
    GROUP BY i.id, i.name, i.category, st.name
    HAVING COUNT(DISTINCT br.id) > 0
    ORDER BY borrow_requests DESC, approval_rate DESC
    LIMIT 50
  `;

  return result;
}

async function getCategoryAnalysis() {
  const result = await db.$queryRaw`
    SELECT 
      COALESCE(i.category, 'Uncategorized') as category,
      st.name as stuff_type,
      COUNT(DISTINCT i.id) as item_count,
      COUNT(DISTINCT br.id) as borrow_requests,
      COUNT(CASE WHEN br.status = 'RETURNED' THEN 1 END) as successful_borrows,
      COALESCE(
        COUNT(CASE WHEN br.status = 'RETURNED' THEN 1 END)::float / 
        NULLIF(COUNT(DISTINCT br.id), 0) * 100,
        0
      ) as success_rate,
      AVG(EXTRACT(EPOCH FROM (br."returnedAt" - br."approvedAt"))/86400) as avg_borrow_duration_days
    FROM items i
    LEFT JOIN borrow_requests br ON br."itemId" = i.id
    LEFT JOIN stuff_types st ON st.id = i."stuffTypeId"
    GROUP BY i.category, st.name
    ORDER BY item_count DESC
  `;

  return result;
}

async function getBorrowSuccessRates(start: Date, end: Date) {
  const result = await db.$queryRaw`
    SELECT 
      DATE_TRUNC('week', br."createdAt") as week,
      COUNT(*) as total_requests,
      COUNT(CASE WHEN br.status = 'APPROVED' THEN 1 END) as approved,
      COUNT(CASE WHEN br.status = 'DECLINED' THEN 1 END) as declined,
      COUNT(CASE WHEN br.status = 'RETURNED' THEN 1 END) as completed,
      COUNT(CASE WHEN br.status = 'PENDING' THEN 1 END) as pending,
      COALESCE(
        COUNT(CASE WHEN br.status = 'APPROVED' THEN 1 END)::float / 
        NULLIF(COUNT(*), 0) * 100,
        0
      ) as approval_rate,
      COALESCE(
        COUNT(CASE WHEN br.status = 'RETURNED' THEN 1 END)::float / 
        NULLIF(COUNT(CASE WHEN br.status = 'APPROVED' THEN 1 END), 0) * 100,
        0
      ) as completion_rate
    FROM borrow_requests br
    WHERE br."createdAt" >= ${start} AND br."createdAt" <= ${end}
    GROUP BY DATE_TRUNC('week', br."createdAt")
    ORDER BY week ASC
  `;

  return result;
}

async function getUserRetentionMetrics() {
  const result = await db.$queryRaw`
    WITH user_cohorts AS (
      SELECT 
        DATE_TRUNC('month', "createdAt") as cohort_month,
        COUNT(*) as users_count
      FROM users
      GROUP BY DATE_TRUNC('month', "createdAt")
    ),
    user_activity AS (
      SELECT 
        u.id,
        DATE_TRUNC('month', u."createdAt") as cohort_month,
        COUNT(DISTINCT DATE_TRUNC('month', br."createdAt")) as active_months
      FROM users u
      LEFT JOIN borrow_requests br ON (br."borrowerId" = u.id OR br."lenderId" = u.id)
      WHERE br."createdAt" >= u."createdAt"
      GROUP BY u.id, DATE_TRUNC('month', u."createdAt")
    )
    SELECT 
      uc.cohort_month,
      uc.users_count,
      COUNT(ua.id) as retained_users,
      AVG(ua.active_months) as avg_active_months,
      COALESCE(
        COUNT(ua.id)::float / NULLIF(uc.users_count, 0) * 100,
        0
      ) as retention_rate
    FROM user_cohorts uc
    LEFT JOIN user_activity ua ON ua.cohort_month = uc.cohort_month
    WHERE uc.cohort_month >= DATE_TRUNC('month', NOW() - INTERVAL '12 months')
    GROUP BY uc.cohort_month, uc.users_count
    ORDER BY uc.cohort_month ASC
  `;

  return result;
}

async function getLibraryEngagementMetrics(start: Date, end: Date) {
  const result = await db.$queryRaw`
    SELECT 
      l.id,
      l.name,
      l."isPublic",
      COUNT(DISTINCT lm.id) as member_count,
      COUNT(DISTINCT il.id) as item_count,
      COUNT(DISTINCT br.id) as borrow_activity,
      COUNT(DISTINCT inv.id) as invitations_sent,
      COUNT(CASE WHEN inv.status = 'ACCEPTED' THEN 1 END) as invitations_accepted,
      COALESCE(
        COUNT(CASE WHEN inv.status = 'ACCEPTED' THEN 1 END)::float / 
        NULLIF(COUNT(DISTINCT inv.id), 0) * 100,
        0
      ) as invitation_acceptance_rate
    FROM libraries l
    LEFT JOIN library_members lm ON lm."libraryId" = l.id AND lm."isActive" = true
    LEFT JOIN item_libraries il ON il."libraryId" = l.id
    LEFT JOIN items i ON i.id = il."itemId"
    LEFT JOIN borrow_requests br ON br."itemId" = i.id 
      AND br."createdAt" >= ${start} AND br."createdAt" <= ${end}
    LEFT JOIN invitations inv ON inv."libraryId" = l.id 
      AND inv."createdAt" >= ${start} AND inv."createdAt" <= ${end}
    GROUP BY l.id, l.name, l."isPublic"
    ORDER BY member_count DESC, borrow_activity DESC
    LIMIT 50
  `;

  return result;
}

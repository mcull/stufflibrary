import { NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { RedisService } from '@/lib/redis';

interface TimeSeriesParams {
  metric: string;
  period: 'day' | 'week' | 'month';
  startDate: string;
  endDate: string;
}

export async function GET(request: Request) {
  try {
    await requireAdminAuth();

    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric') || 'users';
    const period =
      (searchParams.get('period') as TimeSeriesParams['period']) || 'day';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Generate cache key
    const cacheKey = `analytics:timeseries:${metric}:${period}:${startDate}:${endDate}`;

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
        data = (await getUserTimeSeriesData(start, end, period)) as unknown[];
        break;
      case 'items':
        data = (await getItemTimeSeriesData(start, end, period)) as unknown[];
        break;
      case 'borrowRequests':
        data = (await getBorrowRequestTimeSeriesData(
          start,
          end,
          period
        )) as unknown[];
        break;
      case 'libraries':
        data = (await getLibraryTimeSeriesData(
          start,
          end,
          period
        )) as unknown[];
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
      period,
      startDate,
      endDate,
    };

    // Cache the data for 10 minutes
    try {
      await RedisService.set(cacheKey, responseData, { ex: 600 });
    } catch (error) {
      console.warn('Redis set error, proceeding without caching:', error);
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Analytics time series fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Access denied' },
      { status: 401 }
    );
  }
}

async function getUserTimeSeriesData(start: Date, end: Date, period: string) {
  const dateFormat = getDateTruncFormat(period);

  const result = await db.$queryRaw`
    SELECT 
      DATE_TRUNC(${dateFormat}, "createdAt") as date,
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
      COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended
    FROM users 
    WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
    GROUP BY DATE_TRUNC(${dateFormat}, "createdAt")
    ORDER BY date ASC
  `;

  return result;
}

async function getItemTimeSeriesData(start: Date, end: Date, period: string) {
  const dateFormat = getDateTruncFormat(period);

  const result = await db.$queryRaw`
    SELECT 
      DATE_TRUNC(${dateFormat}, "createdAt") as date,
      COUNT(*) as total,
      COUNT(CASE WHEN category IS NOT NULL THEN 1 END) as categorized
    FROM items 
    WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
    GROUP BY DATE_TRUNC(${dateFormat}, "createdAt")
    ORDER BY date ASC
  `;

  return result;
}

async function getBorrowRequestTimeSeriesData(
  start: Date,
  end: Date,
  period: string
) {
  const dateFormat = getDateTruncFormat(period);

  const result = await db.$queryRaw`
    SELECT 
      DATE_TRUNC(${dateFormat}, "createdAt") as date,
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved,
      COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active,
      COUNT(CASE WHEN status = 'RETURNED' THEN 1 END) as returned,
      COUNT(CASE WHEN status = 'DECLINED' THEN 1 END) as declined
    FROM borrow_requests 
    WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
    GROUP BY DATE_TRUNC(${dateFormat}, "createdAt")
    ORDER BY date ASC
  `;

  return result;
}

async function getLibraryTimeSeriesData(
  start: Date,
  end: Date,
  period: string
) {
  const dateFormat = getDateTruncFormat(period);

  const result = await db.$queryRaw`
    SELECT 
      DATE_TRUNC(${dateFormat}, "createdAt") as date,
      COUNT(*) as total,
      COUNT(CASE WHEN "isPublic" = true THEN 1 END) as public,
      COUNT(CASE WHEN "isPublic" = false THEN 1 END) as private
    FROM libraries 
    WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
    GROUP BY DATE_TRUNC(${dateFormat}, "createdAt")
    ORDER BY date ASC
  `;

  return result;
}

function getDateTruncFormat(period: string): string {
  switch (period) {
    case 'day':
      return 'day';
    case 'week':
      return 'week';
    case 'month':
      return 'month';
    default:
      return 'day';
  }
}

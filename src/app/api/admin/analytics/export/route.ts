import { NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    await requireAdminAuth();

    const { format, type, startDate, endDate, filters } = await request.json();

    if (!format || !type) {
      return NextResponse.json(
        { error: 'format and type are required' },
        { status: 400 }
      );
    }

    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    let data: unknown[] = [];
    let filename = '';

    switch (type) {
      case 'users':
        data = (await exportUserData(start, end, filters)) as unknown[];
        filename = `users_export_${formatDateForFilename(start)}_${formatDateForFilename(end)}`;
        break;
      case 'items':
        data = (await exportItemData(start, end, filters)) as unknown[];
        filename = `items_export_${formatDateForFilename(start)}_${formatDateForFilename(end)}`;
        break;
      case 'borrowRequests':
        data = (await exportBorrowRequestData(
          start,
          end,
          filters
        )) as unknown[];
        filename = `borrow_requests_export_${formatDateForFilename(start)}_${formatDateForFilename(end)}`;
        break;
      case 'libraries':
        data = (await exportLibraryData(start, end, filters)) as unknown[];
        filename = `libraries_export_${formatDateForFilename(start)}_${formatDateForFilename(end)}`;
        break;
      case 'analytics':
        data = (await exportAnalyticsData(start, end)) as unknown[];
        filename = `analytics_export_${formatDateForFilename(start)}_${formatDateForFilename(end)}`;
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid export type specified' },
          { status: 400 }
        );
    }

    if (format === 'csv') {
      const csv = convertToCSV(data as Record<string, unknown>[]);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    } else if (format === 'json') {
      return NextResponse.json({
        data,
        exportInfo: {
          type,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          recordCount: data.length,
          exportedAt: new Date().toISOString(),
        },
      });
    } else {
      return NextResponse.json(
        { error: 'Unsupported format. Use csv or json.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Analytics export error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    );
  }
}

async function exportUserData(
  start: Date,
  end: Date,
  _filters?: Record<string, unknown>
) {
  let whereClause = 'WHERE u."createdAt" >= $1 AND u."createdAt" <= $2';
  const params: (Date | string)[] = [start, end];

  if (_filters?.status) {
    whereClause += ' AND u.status = $3';
    params.push(_filters.status as string);
  }

  const result = await db.$queryRaw`
    SELECT 
      u.id,
      u.name,
      u.email,
      u.status,
      u."trustScore",
      u."profileCompleted",
      u."onboardingStep",
      u."createdAt",
      u."updatedAt",
      a.city,
      a.state,
      a.country,
      COUNT(DISTINCT i.id) as items_count,
      COUNT(DISTINCT br_borrowed.id) as items_borrowed,
      COUNT(DISTINCT br_lent.id) as items_lent,
      COUNT(DISTINCT lm.id) as libraries_joined
    FROM users u
    LEFT JOIN addresses a ON a.id = u."currentAddressId"
    LEFT JOIN items i ON i."ownerId" = u.id
    LEFT JOIN borrow_requests br_borrowed ON br_borrowed."borrowerId" = u.id
    LEFT JOIN borrow_requests br_lent ON br_lent."lenderId" = u.id
    LEFT JOIN library_members lm ON lm."userId" = u.id AND lm."isActive" = true
    ${whereClause}
    GROUP BY u.id, u.name, u.email, u.status, u."trustScore", u."profileCompleted", u."onboardingStep", u."createdAt", u."updatedAt", a.city, a.state, a.country
    ORDER BY u."createdAt" DESC
  `;

  return result;
}

async function exportItemData(
  start: Date,
  end: Date,
  _filters?: Record<string, unknown>
) {
  let whereClause = 'WHERE i."createdAt" >= $1 AND i."createdAt" <= $2';
  const params: (Date | string)[] = [start, end];

  if (_filters?.category) {
    whereClause += ' AND i.category = $3';
    params.push(_filters.category as string);
  }

  const result = await db.$queryRaw`
    SELECT 
      i.id,
      i.name,
      i.description,
      i.category,
      i.condition,
      i.location,
      i."createdAt",
      i."updatedAt",
      u.name as owner_name,
      u.email as owner_email,
      st.name as stuff_type,
      COUNT(DISTINCT br.id) as borrow_requests_count,
      COUNT(CASE WHEN br.status = 'RETURNED' THEN 1 END) as successful_borrows
    FROM items i
    INNER JOIN users u ON u.id = i."ownerId"
    LEFT JOIN stuff_types st ON st.id = i."stuffTypeId"
    LEFT JOIN borrow_requests br ON br."itemId" = i.id
    ${whereClause}
    GROUP BY i.id, i.name, i.description, i.category, i.condition, i.location, i."createdAt", i."updatedAt", u.name, u.email, st.name
    ORDER BY i."createdAt" DESC
  `;

  return result;
}

async function exportBorrowRequestData(
  start: Date,
  end: Date,
  _filters?: Record<string, unknown>
) {
  let whereClause = 'WHERE br."createdAt" >= $1 AND br."createdAt" <= $2';
  const params: (Date | string)[] = [start, end];

  if (_filters?.status) {
    whereClause += ' AND br.status = $3';
    params.push(_filters.status as string);
  }

  const result = await db.$queryRaw`
    SELECT 
      br.id,
      br.status,
      br."requestMessage",
      br."lenderMessage",
      br."requestedReturnDate",
      br."actualReturnDate",
      br."createdAt",
      br."approvedAt",
      br."returnedAt",
      borrower.name as borrower_name,
      borrower.email as borrower_email,
      lender.name as lender_name,
      lender.email as lender_email,
      i.name as item_name,
      i.category as item_category,
      EXTRACT(EPOCH FROM (br."returnedAt" - br."approvedAt"))/86400 as borrow_duration_days
    FROM borrow_requests br
    INNER JOIN users borrower ON borrower.id = br."borrowerId"
    INNER JOIN users lender ON lender.id = br."lenderId"
    INNER JOIN items i ON i.id = br."itemId"
    ${whereClause}
    ORDER BY br."createdAt" DESC
  `;

  return result;
}

async function exportLibraryData(
  start: Date,
  end: Date,
  _filters?: Record<string, unknown>
) {
  const result = await db.$queryRaw`
    SELECT 
      l.id,
      l.name,
      l.description,
      l."isPublic",
      l."createdAt",
      l."updatedAt",
      owner.name as owner_name,
      owner.email as owner_email,
      COUNT(DISTINCT lm.id) as member_count,
      COUNT(DISTINCT il.id) as item_count
    FROM libraries l
    INNER JOIN users owner ON owner.id = l."ownerId"
    LEFT JOIN library_members lm ON lm."libraryId" = l.id AND lm."isActive" = true
    LEFT JOIN item_libraries il ON il."libraryId" = l.id
    WHERE l."createdAt" >= ${start} AND l."createdAt" <= ${end}
    GROUP BY l.id, l.name, l.description, l."isPublic", l."createdAt", l."updatedAt", owner.name, owner.email
    ORDER BY l."createdAt" DESC
  `;

  return result;
}

async function exportAnalyticsData(start: Date, end: Date) {
  const [userMetrics, itemMetrics, borrowMetrics, libraryMetrics] =
    await Promise.all([
      db.$queryRaw`
      SELECT 
        'User Metrics' as category,
        COUNT(*) as total_users,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
        AVG("trustScore") as avg_trust_score
      FROM users
      WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
    `,
      db.$queryRaw`
      SELECT 
        'Item Metrics' as category,
        COUNT(*) as total_items,
        COUNT(DISTINCT category) as unique_categories,
        COUNT(CASE WHEN "currentBorrowRequestId" IS NOT NULL THEN 1 END) as borrowed_items
      FROM items
      WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
    `,
      db.$queryRaw`
      SELECT 
        'Borrow Metrics' as category,
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'RETURNED' THEN 1 END) as successful_borrows,
        AVG(EXTRACT(EPOCH FROM ("returnedAt" - "approvedAt"))/86400) as avg_borrow_duration_days
      FROM borrow_requests
      WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
    `,
      db.$queryRaw`
      SELECT 
        'Library Metrics' as category,
        COUNT(*) as total_libraries,
        COUNT(CASE WHEN "isPublic" = true THEN 1 END) as public_libraries,
        AVG(member_counts.member_count) as avg_members_per_library
      FROM libraries l
      LEFT JOIN (
        SELECT 
          lm."libraryId",
          COUNT(*) as member_count
        FROM library_members lm
        WHERE lm."isActive" = true
        GROUP BY lm."libraryId"
      ) member_counts ON member_counts."libraryId" = l.id
      WHERE l."createdAt" >= ${start} AND l."createdAt" <= ${end}
    `,
    ]);

  return [userMetrics, itemMetrics, borrowMetrics, libraryMetrics].flat();
}

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0] || {});
  const csvHeaders = headers.join(',');

  const csvRows = data.map((row) =>
    headers
      .map((header) => {
        const value = row[header];
        // Handle null/undefined values and escape CSV special characters
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (
          stringValue.includes(',') ||
          stringValue.includes('"') ||
          stringValue.includes('\n')
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(',')
  );

  return [csvHeaders, ...csvRows].join('\n');
}

function formatDateForFilename(date: Date): string {
  return date.toISOString().split('T')[0] || '';
}

import { NextRequest, NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';
// TODO: Uncomment when schema is migrated
// import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '50', 10),
      200
    );
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType') as
      | 'BORROW_REQUEST'
      | 'ITEM'
      | null;
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (action) {
      where.action = action;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // TODO: Replace with actual database once schema is migrated
    const auditLogs: any[] = [];
    const totalCount = 0;

    // Note: This endpoint assumes the audit_logs table exists
    // Currently the audit-log.ts file logs to console only
    // This will work once the database schema is migrated
    // try {
    //   const [auditLogs, totalCount] = await Promise.all([
    //     db.auditLog.findMany({
    //       where,
    //       include: {
    //         user: {
    //           select: {
    //             id: true,
    //             name: true,
    //             email: true,
    //           },
    //         },
    //       },
    //       orderBy: {
    //         createdAt: 'desc',
    //       },
    //       skip: offset,
    //       take: limit,
    //     }),
    //     db.auditLog.count({ where }),
    //   ]);

    return NextResponse.json({
      auditLogs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: offset + limit < totalCount,
        hasPrev: page > 1,
      },
      message:
        'Audit logs table not yet created. Run database migration first.',
    });
    // } catch (error) {
    //   // If audit_logs table doesn't exist yet, return empty result
    //   if (error instanceof Error && error.message.includes('does not exist')) {
    //     return NextResponse.json({
    //       auditLogs: [],
    //       pagination: {
    //         page: 1,
    //         limit,
    //         totalCount: 0,
    //         totalPages: 0,
    //         hasNext: false,
    //         hasPrev: false,
    //       },
    //       message: 'Audit logs table not yet created. Run database migration first.',
    //     });
    //   }
    //   throw error;
    // }
  } catch (error) {
    console.error('Audit logs fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Access denied' },
      { status: 401 }
    );
  }
}

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
    const severity = searchParams.get('severity') as
      | 'INFO'
      | 'LOW'
      | 'MEDIUM'
      | 'HIGH'
      | 'CRITICAL'
      | null;
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const ipAddress = searchParams.get('ipAddress');

    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (severity) {
      where.severity = severity;
    }

    if (type) {
      where.type = type;
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

    if (ipAddress) {
      where.ipAddress = {
        contains: ipAddress,
        mode: 'insensitive',
      };
    }

    // TODO: Replace with actual database once schema is migrated
    const events: any[] = [];
    const totalCount = 0;

    // Uncomment when schema is migrated:
    // const [events, totalCount] = await Promise.all([
    //   db.securityEvent.findMany({
    //     where,
    //     include: {
    //       user: {
    //         select: {
    //           id: true,
    //           name: true,
    //           email: true,
    //           status: true,
    //         },
    //       },
    //     },
    //     orderBy: {
    //       createdAt: 'desc',
    //     },
    //     skip: offset,
    //     take: limit,
    //   }),
    //   db.securityEvent.count({ where }),
    // ]);

    return NextResponse.json({
      events,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: offset + limit < totalCount,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Security events fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Access denied' },
      { status: 401 }
    );
  }
}

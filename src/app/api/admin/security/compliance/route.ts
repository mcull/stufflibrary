import { NextRequest, NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';
// TODO: Uncomment when schema is migrated
// import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as
      | 'GDPR_EXPORT'
      | 'GDPR_DELETION'
      | 'PRIVACY_AUDIT'
      | 'DATA_BREACH'
      | null;
    const status = searchParams.get('status') as
      | 'PENDING'
      | 'IN_PROGRESS'
      | 'COMPLETED'
      | 'FAILED'
      | null;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '50', 10),
      200
    );

    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    try {
      // TODO: Replace with actual database once schema is migrated
      const complianceReports: any[] = [];
      const totalCount = 0;

      // Uncomment when schema is migrated:
      // const [complianceReports, totalCount] = await Promise.all([
      //   db.complianceReport.findMany({
      //     where,
      //     include: {
      //       user: {
      //         select: {
      //           id: true,
      //           name: true,
      //           email: true,
      //         },
      //       },
      //       generatedBy: {
      //         select: {
      //           id: true,
      //           name: true,
      //           email: true,
      //         },
      //       },
      //     },
      //     orderBy: {
      //       createdAt: 'desc',
      //     },
      //     skip: offset,
      //     take: limit,
      //   }),
      //   db.complianceReport.count({ where }),
      // ]);

      return NextResponse.json({
        complianceReports,
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
      // If compliance_reports table doesn't exist yet, return empty result
      if (error instanceof Error && error.message.includes('does not exist')) {
        return NextResponse.json({
          complianceReports: [],
          pagination: {
            page: 1,
            limit,
            totalCount: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
          message:
            'Compliance reports table not yet created. Run database migration first.',
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Compliance reports fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Access denied' },
      { status: 401 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const _session = await requireAdminAuth();
    const body = await request.json();

    const { type, userId, description } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'Report type is required' },
        { status: 400 }
      );
    }

    // TODO: Replace with actual database once schema is migrated
    const complianceReport = {
      id: `mock-${Date.now()}`,
      type,
      status: 'PENDING',
      userId,
      description,
      createdAt: new Date().toISOString(),
    };

    // Uncomment when schema is migrated:
    // const complianceReport = await db.complianceReport.create({
    //   data: {
    //     type,
    //     status: 'PENDING',
    //     userId,
    //     description,
    //     generatedById: session.user?.email, // This should map to user ID in real implementation
    //     metadata: {
    //       requestedAt: new Date().toISOString(),
    //       requestedBy: session.user?.email,
    //     },
    //   },
    //   include: {
    //     user: {
    //       select: {
    //         id: true,
    //         name: true,
    //         email: true,
    //       },
    //     },
    //     generatedBy: {
    //       select: {
    //         id: true,
    //         name: true,
    //         email: true,
    //       },
    //     },
    //   },
    // });

    return NextResponse.json({ complianceReport });
  } catch (error) {
    console.error('Create compliance report error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create compliance report',
      },
      { status: 500 }
    );
  }
}

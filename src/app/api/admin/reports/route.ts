import { ReportStatus, ReportPriority, UserReportReason } from '@prisma/client';
import { NextRequest } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') as ReportStatus | '';
    const priority = searchParams.get('priority') as ReportPriority | '';
    const reason = searchParams.get('reason') as UserReportReason | '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        {
          reporter: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
        {
          reported: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (reason) {
      where.reason = reason;
    }

    const [reports, total] = await Promise.all([
      db.userReport.findMany({
        where,
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          reported: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              trustScore: true,
              warningCount: true,
              suspensionCount: true,
              isSuspended: true,
            },
          },
          item: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          library: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
      }),
      db.userReport.count({ where }),
    ]);

    const pages = Math.ceil(total / limit);

    return Response.json({
      reports,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error fetching reports:', error);
    }
    return Response.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdminAuth();

    const { reportIds, action, data } = await request.json();

    if (!reportIds?.length || !action) {
      return Response.json(
        { error: 'Report IDs and action are required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'resolve':
        await db.userReport.updateMany({
          where: { id: { in: reportIds } },
          data: {
            status: ReportStatus.RESOLVED,
            reviewedAt: new Date(),
            notes: data?.notes,
          },
        });
        break;

      case 'dismiss':
        await db.userReport.updateMany({
          where: { id: { in: reportIds } },
          data: {
            status: ReportStatus.DISMISSED,
            reviewedAt: new Date(),
            notes: data?.notes,
          },
        });
        break;

      case 'escalate':
        await db.userReport.updateMany({
          where: { id: { in: reportIds } },
          data: {
            status: ReportStatus.ESCALATED,
            priority: ReportPriority.HIGH,
            reviewedAt: new Date(),
            notes: data?.notes,
          },
        });
        break;

      case 'updatePriority':
        if (!data?.priority) {
          return Response.json(
            { error: 'Priority is required for priority update' },
            { status: 400 }
          );
        }
        await db.userReport.updateMany({
          where: { id: { in: reportIds } },
          data: { priority: data.priority },
        });
        break;

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error updating reports:', error);
    }
    return Response.json(
      { error: 'Failed to update reports' },
      { status: 500 }
    );
  }
}

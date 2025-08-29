import { DisputeStatus, DisputeType, ReportPriority } from '@prisma/client';
import { NextRequest } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') as DisputeStatus | '';
    const type = searchParams.get('type') as DisputeType | '';
    const priority = searchParams.get('priority') as ReportPriority | '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        {
          partyA: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
        {
          partyB: {
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

    if (type) {
      where.type = type;
    }

    if (priority) {
      where.priority = priority;
    }

    const [disputes, total] = await Promise.all([
      db.dispute.findMany({
        where,
        include: {
          partyA: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              trustScore: true,
            },
          },
          partyB: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              trustScore: true,
            },
          },
          item: {
            select: {
              id: true,
              name: true,
              description: true,
              imageUrl: true,
            },
          },
          borrowRequest: {
            select: {
              id: true,
              status: true,
              requestedReturnDate: true,
              actualReturnDate: true,
            },
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
      }),
      db.dispute.count({ where }),
    ]);

    const pages = Math.ceil(total / limit);

    return Response.json({
      disputes,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    });
  } catch (error) {
    console.error('Error fetching disputes:', error);
    return Response.json(
      { error: 'Failed to fetch disputes' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdminAuth();

    const { disputeIds, action, data } = await request.json();

    if (!disputeIds?.length || !action) {
      return Response.json(
        { error: 'Dispute IDs and action are required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'resolve':
        if (!data?.resolution) {
          return Response.json(
            { error: 'Resolution is required' },
            { status: 400 }
          );
        }
        await db.dispute.updateMany({
          where: { id: { in: disputeIds } },
          data: {
            status: DisputeStatus.RESOLVED,
            resolution: data.resolution,
            resolvedAt: new Date(),
          },
        });
        break;

      case 'close':
        await db.dispute.updateMany({
          where: { id: { in: disputeIds } },
          data: {
            status: DisputeStatus.CLOSED,
            resolvedAt: new Date(),
          },
        });
        break;

      case 'updateStatus':
        if (!data?.status) {
          return Response.json(
            { error: 'Status is required' },
            { status: 400 }
          );
        }
        await db.dispute.updateMany({
          where: { id: { in: disputeIds } },
          data: { status: data.status },
        });
        break;

      case 'updatePriority':
        if (!data?.priority) {
          return Response.json(
            { error: 'Priority is required' },
            { status: 400 }
          );
        }
        await db.dispute.updateMany({
          where: { id: { in: disputeIds } },
          data: { priority: data.priority },
        });
        break;

      case 'assign':
        if (!data?.assignedTo) {
          return Response.json(
            { error: 'Assigned admin is required' },
            { status: 400 }
          );
        }
        await db.dispute.updateMany({
          where: { id: { in: disputeIds } },
          data: { assignedTo: data.assignedTo },
        });
        break;

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error updating disputes:', error);
    return Response.json(
      { error: 'Failed to update disputes' },
      { status: 500 }
    );
  }
}

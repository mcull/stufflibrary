import { AdminActionType } from '@prisma/client';
import { NextRequest } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') as AdminActionType | '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        {
          targetUser: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
        {
          admin: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    if (type) {
      where.type = type;
    }

    const [actions, total] = await Promise.all([
      db.adminAction.findMany({
        where,
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          targetUser: {
            select: {
              id: true,
              name: true,
              email: true,
              trustScore: true,
              warningCount: true,
              suspensionCount: true,
              isSuspended: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      db.adminAction.count({ where }),
    ]);

    const pages = Math.ceil(total / limit);

    return Response.json({
      actions,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    });
  } catch (error) {
    console.error('Error fetching admin actions:', error);
    return Response.json(
      { error: 'Failed to fetch admin actions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdminAuth();

    const { type, targetUserId, description, reason, metadata } =
      await request.json();

    if (!type || !targetUserId || !description) {
      return Response.json(
        { error: 'Type, target user ID, and description are required' },
        { status: 400 }
      );
    }

    // Start a transaction to ensure data consistency
    const result = await db.$transaction(async (tx) => {
      // Create the admin action record
      const adminAction = await tx.adminAction.create({
        data: {
          type,
          description,
          reason,
          metadata,
          adminId: (adminUser as { user: { id: string } }).user.id,
          targetUserId,
        },
      });

      // Apply the action to the target user
      switch (type as AdminActionType) {
        case AdminActionType.USER_WARNING:
          await tx.user.update({
            where: { id: targetUserId },
            data: {
              warningCount: { increment: 1 },
              lastWarningAt: new Date(),
            },
          });
          break;

        case AdminActionType.USER_SUSPENSION:
          const suspensionDays = metadata?.days || 7;
          const suspensionEnds = new Date();
          suspensionEnds.setDate(suspensionEnds.getDate() + suspensionDays);

          await tx.user.update({
            where: { id: targetUserId },
            data: {
              isSuspended: true,
              suspensionEndsAt: suspensionEnds,
              suspensionCount: { increment: 1 },
              lastSuspensionAt: new Date(),
            },
          });
          break;

        case AdminActionType.USER_UNSUSPENSION:
          await tx.user.update({
            where: { id: targetUserId },
            data: {
              isSuspended: false,
              suspensionEndsAt: null,
            },
          });
          break;

        case AdminActionType.TRUST_SCORE_ADJUSTMENT:
          const adjustment = metadata?.adjustment || 0;
          await tx.user.update({
            where: { id: targetUserId },
            data: {
              trustScore: { increment: adjustment },
            },
          });
          break;
      }

      return adminAction;
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating admin action:', error);
    return Response.json(
      { error: 'Failed to create admin action' },
      { status: 500 }
    );
  }
}

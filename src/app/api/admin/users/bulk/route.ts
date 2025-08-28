import { NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    await requireAdminAuth();

    const { action, userIds } = await request.json();

    if (
      !action ||
      !userIds ||
      !Array.isArray(userIds) ||
      userIds.length === 0
    ) {
      return NextResponse.json(
        { error: 'Invalid request. Action and userIds are required.' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'suspend':
        result = await db.user.updateMany({
          where: { id: { in: userIds } },
          data: { status: 'suspended' },
        });
        break;

      case 'activate':
        result = await db.user.updateMany({
          where: { id: { in: userIds } },
          data: { status: 'active' },
        });
        break;

      case 'deactivate':
        result = await db.user.updateMany({
          where: { id: { in: userIds } },
          data: { status: 'inactive' },
        });
        break;

      case 'export':
        // Get user data for export
        const users = await db.user.findMany({
          where: { id: { in: userIds } },
          include: {
            _count: {
              select: {
                items: true,
                borrowRequests: true,
                addresses: true,
              },
            },
            borrowRequests: {
              select: {
                status: true,
                createdAt: true,
              },
            },
            items: {
              select: {
                name: true,
                createdAt: true,
              },
            },
          },
        });

        return NextResponse.json({ users, exported: true });

      default:
        return NextResponse.json(
          {
            error:
              'Invalid action. Supported actions: suspend, activate, deactivate, export',
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      affected: result?.count || 0,
      action,
    });
  } catch (error) {
    console.error('Bulk user operation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 }
    );
  }
}

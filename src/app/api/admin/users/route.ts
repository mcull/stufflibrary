import { NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    await requireAdminAuth();

    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        profileCompleted: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            items: true,
            borrowRequests: true,
            addresses: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Admin users fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Access denied' },
      { status: 401 }
    );
  }
}
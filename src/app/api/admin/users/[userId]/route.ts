import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';

const updateUserSchema = z.object({
  action: z.enum(['suspend', 'activate', 'deactivate']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await requireAdminAuth();

    const body = await request.json();
    const { action } = updateUserSchema.parse(body);
    const { userId } = params;

    let newStatus: string;
    switch (action) {
      case 'suspend':
        newStatus = 'suspended';
        break;
      case 'activate':
        newStatus = 'active';
        break;
      case 'deactivate':
        newStatus = 'inactive';
        break;
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { status: newStatus },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Admin user update error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Access denied' },
      { status: 401 }
    );
  }
}
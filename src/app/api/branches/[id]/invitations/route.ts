import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id!;
    const branchId = id;

    // Check if user is branch owner or admin
    const branch = await db.branch.findFirst({
      where: {
        id: branchId,
        OR: [
          { ownerId: userId }, // Owner
          {
            members: {
              some: {
                userId: userId,
                role: 'admin',
                isActive: true,
              },
            },
          }, // Admin member
        ],
      },
    });

    if (!branch) {
      return NextResponse.json(
        { error: 'Branch not found or insufficient permissions' },
        { status: 403 }
      );
    }

    // Get all invitations for this branch
    const invitations = await db.invitation.findMany({
      where: {
        branchId,
        type: 'branch',
      },
      include: {
        sender: {
          select: {
            name: true,
            email: true,
          },
        },
        receiver: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform invitations for response
    const transformedInvitations = invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      status: invitation.status,
      createdAt: invitation.createdAt,
      sentAt: invitation.sentAt,
      acceptedAt: invitation.acceptedAt,
      expiresAt: invitation.expiresAt,
      sender: invitation.sender,
      receiver: invitation.receiver,
      isExpired: new Date() > invitation.expiresAt,
    }));

    return NextResponse.json({
      invitations: transformedInvitations,
    });
  } catch (error) {
    console.error('Error fetching branch invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}

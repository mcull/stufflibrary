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
    const libraryId = id;

    // Check if user is library owner or admin
    const library = await db.library.findFirst({
      where: {
        id: libraryId,
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

    if (!library) {
      return NextResponse.json(
        { error: 'Library not found or insufficient permissions' },
        { status: 403 }
      );
    }

    // Get all invitations for this library
    const invitations = await db.invitation.findMany({
      where: {
        libraryId,
        type: 'library',
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
    console.error('Error fetching library invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: (session.user as { id?: string }).id! },
      select: { email: true },
    });

    if (!user?.email) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    // Get all pending invitations for this user's email
    const invitations = await db.invitation.findMany({
      where: {
        email: user.email,
        type: 'collection',
        status: { in: ['PENDING', 'SENT'] },
        expiresAt: {
          gte: new Date(), // Only non-expired invitations
        },
      },
      include: {
        collection: {
          select: {
            id: true,
            name: true,
            location: true,
            owner: {
              select: {
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                members: {
                  where: {
                    isActive: true,
                  },
                },
              },
            },
          },
        },
        sender: {
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

    // Check which collections the user is already a member of
    const userCollectionIds = await db.collectionMember
      .findMany({
        where: {
          userId: (session.user as { id?: string }).id!,
          isActive: true,
        },
        select: {
          collectionId: true,
        },
      })
      .then((memberships) => memberships.map((m) => m.collectionId));

    // Filter out invitations for collections user is already in
    const validInvitations = invitations.filter(
      (invitation) => !userCollectionIds.includes(invitation.collection!.id)
    );

    // Transform invitations for response
    const transformedInvitations = validInvitations.map((invitation) => ({
      id: invitation.id,
      token: invitation.token, // Include token for acceptance
      collection: {
        id: invitation.collection!.id,
        name: invitation.collection!.name,
        location: invitation.collection!.location,
        owner: invitation.collection!.owner,
        memberCount: invitation.collection!._count.members,
      },
      invitedBy: invitation.sender,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
    }));

    return NextResponse.json({
      invitations: transformedInvitations,
    });
  } catch (error) {
    console.error('Error fetching pending invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending invitations' },
      { status: 500 }
    );
  }
}

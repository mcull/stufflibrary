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
        type: 'library',
        status: { in: ['PENDING', 'SENT'] },
        expiresAt: {
          gte: new Date(), // Only non-expired invitations
        },
      },
      include: {
        library: {
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

    // Check which libraries the user is already a member of
    const userLibraryIds = await db.libraryMember
      .findMany({
        where: {
          userId: (session.user as { id?: string }).id!,
          isActive: true,
        },
        select: {
          libraryId: true,
        },
      })
      .then((memberships) => memberships.map((m) => m.libraryId));

    // Filter out invitations for libraries user is already in
    const validInvitations = invitations.filter(
      (invitation) => !userLibraryIds.includes(invitation.libraryId!)
    );

    // Transform invitations for response
    const transformedInvitations = validInvitations.map((invitation) => ({
      id: invitation.id,
      token: invitation.token, // Include token for acceptance
      library: {
        id: invitation.library!.id,
        name: invitation.library!.name,
        location: invitation.library!.location,
        owner: invitation.library!.owner,
        memberCount: invitation.library!._count.members,
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

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
        type: 'branch',
        status: { in: ['PENDING', 'SENT'] },
        expiresAt: {
          gte: new Date(), // Only non-expired invitations
        },
      },
      include: {
        branch: {
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

    // Check which branches the user is already a member of
    const userBranchIds = await db.branchMember
      .findMany({
        where: {
          userId: (session.user as { id?: string }).id!,
          isActive: true,
        },
        select: {
          branchId: true,
        },
      })
      .then((memberships) => memberships.map((m) => m.branchId));

    // Filter out invitations for branches user is already in
    const validInvitations = invitations.filter(
      (invitation) => !userBranchIds.includes(invitation.branchId!)
    );

    // Transform invitations for response
    const transformedInvitations = validInvitations.map((invitation) => ({
      id: invitation.id,
      token: invitation.token, // Include token for acceptance
      branch: {
        id: invitation.branch!.id,
        name: invitation.branch!.name,
        location: invitation.branch!.location,
        owner: invitation.branch!.owner,
        memberCount: invitation.branch!._count.members,
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

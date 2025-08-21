import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id!;
    // token already extracted above

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 400 }
      );
    }

    // Find and validate invitation
    const invitation = await db.invitation.findFirst({
      where: {
        token,
        type: 'branch',
        status: { in: ['PENDING', 'SENT'] },
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
              },
            },
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or already processed' },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    if (new Date() > invitation.expiresAt) {
      await db.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });

      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      );
    }

    // Verify the user's email matches the invitation
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user || user.email !== invitation.email) {
      return NextResponse.json(
        { error: 'Email mismatch - this invitation is not for your account' },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const existingMembership = await db.branchMember.findFirst({
      where: {
        userId,
        branchId: invitation.branchId!,
        isActive: true,
      },
    });

    if (existingMembership) {
      // Mark invitation as accepted anyway
      await db.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          receiverId: userId,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'You are already a member of this branch',
        branch: {
          id: invitation.branch!.id,
          name: invitation.branch!.name,
          role: existingMembership.role,
        },
      });
    }

    // Create branch membership and mark invitation as accepted
    const [branchMember] = await db.$transaction([
      db.branchMember.create({
        data: {
          userId,
          branchId: invitation.branchId!,
          role: 'member',
          isActive: true,
        },
      }),
      db.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          receiverId: userId,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      branch: {
        id: invitation.branch!.id,
        name: invitation.branch!.name,
        location: invitation.branch!.location,
        role: branchMember.role,
      },
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}

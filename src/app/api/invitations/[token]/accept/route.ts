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
        type: 'library',
        status: { in: ['PENDING', 'SENT'] },
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

    // Check if user is already a member (active or inactive)
    const existingMembership = await db.collectionMember.findFirst({
      where: {
        userId,
        collectionId: invitation.libraryId!,
      },
      select: { id: true, isActive: true, role: true },
    });

    if (existingMembership) {
      // Reactivate if needed
      if (!existingMembership.isActive) {
        await db.collectionMember.update({
          where: { id: existingMembership.id },
          data: { isActive: true },
        });
      }
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
        message: 'You are already a member of this library',
        library: {
          id: invitation.collection!.id,
          name: invitation.collection!.name,
          role: existingMembership.role,
        },
      });
    }

    // Create library membership and mark invitation as accepted
    const [libraryMember] = await db.$transaction([
      db.collectionMember.create({
        data: {
          userId,
          collectionId: invitation.libraryId!,
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

    // Get user's name for welcome banner
    const userDetails = await db.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    const firstName = userDetails?.name?.split(' ')[0] || '';

    return NextResponse.json({
      success: true,
      library: {
        id: invitation.collection!.id,
        name: invitation.collection!.name,
        location: invitation.collection!.location,
        role: libraryMember.role,
      },
      user: {
        firstName,
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

import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  try {
    // token already extracted above

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 400 }
      );
    }

    // Find invitation with details for UI display
    const invitation = await db.invitation.findFirst({
      where: {
        token,
        type: 'collection',
        status: { in: ['PENDING', 'SENT'] },
      },
      include: {
        collection: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        sender: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or expired' },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation: {
        email: invitation.email,
        collection: invitation.collection,
        sender: invitation.sender,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error('Error fetching invitation details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitation details' },
      { status: 500 }
    );
  }
}

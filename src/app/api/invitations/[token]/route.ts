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
      return NextResponse.redirect(
        new URL('/auth/error?error=invalid_invitation', request.url)
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
      return NextResponse.redirect(
        new URL('/auth/error?error=invitation_not_found', request.url)
      );
    }

    // Check if invitation has expired
    if (new Date() > invitation.expiresAt) {
      // Mark as expired
      await db.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });

      return NextResponse.redirect(
        new URL('/auth/error?error=invitation_expired', request.url)
      );
    }

    // Check if user already exists and is already a member
    const existingUser = await db.user.findFirst({
      where: { email: invitation.email },
      include: {
        branchMemberships: {
          where: {
            branchId: invitation.branchId!,
            isActive: true,
          },
        },
      },
    });

    if (
      existingUser?.branchMemberships &&
      existingUser.branchMemberships.length > 0
    ) {
      return NextResponse.redirect(
        new URL(
          `/branch/${invitation.branchId}?message=already_member`,
          request.url
        )
      );
    }

    // Store invitation token in URL for the auth callback to process
    const callbackUrl = `/auth/callback?invitation=${token}`;

    // For magic link authentication, we redirect to NextAuth callback
    // The callback will handle creating/logging in the user and processing the invitation
    return NextResponse.redirect(new URL(callbackUrl, request.url));
  } catch (error) {
    console.error('Error processing invitation link:', error);
    return NextResponse.redirect(
      new URL('/auth/error?error=invitation_processing_failed', request.url)
    );
  }
}

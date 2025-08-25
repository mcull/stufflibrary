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
        status: { in: ['PENDING', 'SENT', 'ACCEPTED'] },
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

    // Check if user already exists and is already a member of THIS SPECIFIC branch
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

    // Only redirect if they're already a member of THIS specific branch
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

    // If invitation is already accepted, redirect to sign-in instead of magic link
    if (invitation.status === 'ACCEPTED') {
      return NextResponse.redirect(
        new URL(
          `/auth/signin?invitation=${token}&email=${encodeURIComponent(invitation.email)}`,
          request.url
        )
      );
    }

    // Redirect to magic link authentication endpoint
    // This will handle user creation, session creation, and invitation processing
    return NextResponse.redirect(
      new URL(`/api/auth/magic-link?token=${token}`, request.url)
    );
  } catch (error) {
    console.error('Error processing invitation link:', error);
    return NextResponse.redirect(
      new URL('/auth/error?error=invitation_processing_failed', request.url)
    );
  }
}

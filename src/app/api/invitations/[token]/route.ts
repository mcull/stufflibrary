import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    if (!token || typeof token !== 'string') {
      return redirect('/auth/error?error=invalid_invitation');
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
      return redirect('/auth/error?error=invitation_not_found');
    }

    // Check if invitation has expired
    if (new Date() > invitation.expiresAt) {
      // Mark as expired
      await db.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });

      return redirect('/auth/error?error=invitation_expired');
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

    if (existingUser?.branchMemberships.length > 0) {
      return redirect(`/branch/${invitation.branchId}?message=already_member`);
    }

    // Store invitation token in URL for the auth callback to process
    const callbackUrl = `/auth/callback?invitation=${token}`;

    // For magic link authentication, we redirect to NextAuth callback
    // The callback will handle creating/logging in the user and processing the invitation
    return redirect(callbackUrl);
  } catch (error) {
    console.error('Error processing invitation link:', error);
    return redirect('/auth/error?error=invitation_processing_failed');
  }
}

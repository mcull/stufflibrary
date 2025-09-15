import { NextRequest, NextResponse } from 'next/server';

import { storeAuthCode } from '@/lib/auth-codes';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invitationToken = searchParams.get('token');

    if (!invitationToken) {
      return NextResponse.redirect(
        new URL('/auth/error?error=invalid_invitation', request.url)
      );
    }

    // Validate invitation - don't filter by expiration here, check it separately
    const invitation = await db.invitation.findFirst({
      where: {
        token: invitationToken,
        type: 'library',
        status: { in: ['PENDING', 'SENT'] },
      },
      include: {
        collection: { select: { id: true, name: true } },
      },
    });

    if (!invitation) {
      return NextResponse.redirect(
        new URL('/auth/error?error=invitation_not_found', request.url)
      );
    }

    // Check if invitation has expired
    if (new Date() > invitation.expiresAt) {
      await db.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      return NextResponse.redirect(
        new URL('/auth/error?error=invitation_expired', request.url)
      );
    }

    // Create or find user from invitation email
    const user = await db.user.upsert({
      where: { email: invitation.email },
      update: {
        emailVerified: new Date(),
        updatedAt: new Date(),
      },
      create: {
        email: invitation.email,
        emailVerified: new Date(),
        profileCompleted: false,
      },
    });

    // Create library membership if needed
    const existingMembership = await db.collectionMember.findFirst({
      where: {
        userId: user.id,
        collectionId: invitation.libraryId!,
        isActive: true,
      },
    });

    if (!existingMembership) {
      await db.$transaction([
        db.collectionMember.create({
          data: {
            userId: user.id,
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
            receiverId: user.id,
          },
        }),
      ]);
    } else {
      // Mark invitation as accepted even if already member
      await db.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          receiverId: user.id,
        },
      });
    }

    // Generate a temporary auth code and redirect to sign-in with auto-fill
    const tempCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code

    // Set the auth code for the user
    await storeAuthCode(user.email!, tempCode);

    // Create a special redirect URL that will auto-complete the sign-in
    const redirectUrl = new URL('/auth/signin', request.url);
    redirectUrl.searchParams.set('email', user.email!);
    redirectUrl.searchParams.set('code', tempCode);
    if (invitationToken) {
      redirectUrl.searchParams.set('invitation', invitationToken);
      redirectUrl.searchParams.set('library', invitation.libraryId!);
    }
    redirectUrl.searchParams.set('magic', 'true');
    redirectUrl.searchParams.set('auto', 'true'); // Signal for auto-completion

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Error processing magic link:', error);
    return NextResponse.redirect(
      new URL('/auth/error?error=invitation_processing_failed', request.url)
    );
  }
}

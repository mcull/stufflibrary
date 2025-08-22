import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

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

    // Validate invitation
    const invitation = await db.invitation.findFirst({
      where: {
        token: invitationToken,
        type: 'branch',
        status: { in: ['PENDING', 'SENT'] },
        expiresAt: { gte: new Date() },
      },
      include: {
        branch: { select: { id: true, name: true } },
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

    // Create branch membership if needed
    const existingMembership = await db.branchMember.findFirst({
      where: {
        userId: user.id,
        branchId: invitation.branchId!,
        isActive: true,
      },
    });

    if (!existingMembership) {
      await db.$transaction([
        db.branchMember.create({
          data: {
            userId: user.id,
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

    // Create NextAuth session manually
    const cookieStore = await cookies();
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

    // Create JWT token compatible with NextAuth
    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      name: user.name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60, // 90 days
    })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(secret);

    // Set session cookie with same settings as NextAuth
    cookieStore.set('next-auth.session-token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 90 * 24 * 60 * 60, // 90 days
    });

    // Redirect based on profile completion
    if (user.profileCompleted) {
      return NextResponse.redirect(
        new URL(
          `/branch/${invitation.branchId}?message=joined_successfully`,
          request.url
        )
      );
    } else {
      return NextResponse.redirect(
        new URL(
          `/profile/create?invitation=${invitationToken}&branch=${invitation.branchId}`,
          request.url
        )
      );
    }
  } catch (error) {
    console.error('Error processing magic link:', error);
    return NextResponse.redirect(
      new URL('/auth/error?error=invitation_processing_failed', request.url)
    );
  }
}

import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

interface AuthCallbackPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AuthCallbackPage({
  searchParams,
}: AuthCallbackPageProps) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);
  const invitationToken = params.invitation as string;

  // If user is not authenticated but has an invitation token, handle magic link auth
  if (!session?.user && invitationToken) {
    try {
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

      if (invitation) {
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

        // Create branch membership
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
        }

        // Create NextAuth session manually
        const cookieStore = await cookies();
        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

        // Create JWT token
        const token = await new SignJWT({
          sub: user.id,
          email: user.email,
          name: user.name,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60, // 90 days
        })
          .setProtectedHeader({ alg: 'HS256' })
          .sign(secret);

        // Set session cookie
        cookieStore.set('next-auth.session-token', token, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 90 * 24 * 60 * 60, // 90 days
        });

        // Redirect based on profile completion
        if (user.profileCompleted) {
          redirect(
            `/branch/${invitation.branchId}?message=joined_successfully`
          );
        } else {
          redirect(
            `/profile/create?invitation=${invitationToken}&branch=${invitation.branchId}`
          );
        }
      }
    } catch (error) {
      console.error('Error processing magic link invitation:', error);
    }

    // Fallback to normal sign-in if invitation processing fails
    redirect(
      `/auth/signin${invitationToken ? `?invitation=${invitationToken}` : ''}`
    );
  }

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // For authenticated users, handle normal callback flow
  const userId =
    (session.user as { id?: string }).id ||
    (session as { user?: { id?: string }; userId?: string }).user?.id ||
    (session as { userId?: string }).userId;
  const userEmail = session.user?.email ?? undefined;

  let user = null as { id: string; profileCompleted: boolean } | null;
  if (userId) {
    user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, profileCompleted: true },
    });
  }
  if (!user && userEmail) {
    user = await db.user.findUnique({
      where: { email: userEmail },
      select: { id: true, profileCompleted: true },
    });
  }

  // If there's an invitation token, process it for authenticated users
  if (invitationToken && user) {
    try {
      // Validate and process the invitation
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

      if (invitation && invitation.email === userEmail) {
        // Check if user is already a member
        const existingMembership = await db.branchMember.findFirst({
          where: {
            userId: user.id,
            branchId: invitation.branchId!,
            isActive: true,
          },
        });

        if (!existingMembership) {
          // Create membership and mark invitation as accepted
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
        }

        // Redirect based on profile completion status
        if (user.profileCompleted) {
          redirect(
            `/branch/${invitation.branchId}?message=joined_successfully`
          );
        } else {
          redirect(
            `/profile/create?invitation=${invitationToken}&branch=${invitation.branchId}`
          );
        }
      }
    } catch (error) {
      console.error('Error processing invitation in callback:', error);
      // Continue with normal flow if invitation processing fails
    }
  }

  // Normal callback flow
  if (user?.profileCompleted) {
    redirect('/lobby');
  }
  redirect('/profile/create');
}

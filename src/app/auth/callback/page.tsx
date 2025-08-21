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

  if (!session?.user) {
    const invitationToken = params.invitation as string;
    const signInUrl =
      '/auth/signin' +
      (invitationToken ? `?invitation=${invitationToken}` : '');
    redirect(signInUrl);
  }

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

  const invitationToken = params.invitation as string;

  // If there's an invitation token, process it
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

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
  const invitationToken = params.invitation as string;

  // Handle magic link authentication FIRST (before checking any existing session)
  if (invitationToken) {
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
        // Check if there's already a session
        const existingSession = await getServerSession(authOptions);

        if (existingSession?.user) {
          // User is already authenticated - just process the invitation
          const userEmail = existingSession.user?.email;
          if (invitation.email === userEmail) {
            const userId = (existingSession.user as { id?: string }).id;

            if (userId) {
              const user = await db.user.findUnique({
                where: { id: userId },
                select: { id: true, profileCompleted: true },
              });

              if (user) {
                // Create membership if needed
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
            }
          }
        } else {
          // No existing session - redirect to sign-in but auto-populate with magic link info
          // Store invitation processing info in URL for sign-in to handle
          redirect(
            `/auth/signin?invitation=${invitationToken}&magic=true&email=${encodeURIComponent(invitation.email)}`
          );
        }
      }
    } catch (error) {
      console.error('Error processing magic link invitation:', error);
    }

    // Fallback to normal sign-in if invitation processing fails
    redirect(`/auth/signin?invitation=${invitationToken}`);
  }

  // Normal callback flow for non-invitation requests
  const session = await getServerSession(authOptions);
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
      } else if (invitation) {
        // Invitation exists but email doesn't match - create/update user account with invitation email
        const invitationUser = await db.user.upsert({
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
            userId: invitationUser.id,
            branchId: invitation.branchId!,
            isActive: true,
          },
        });

        if (!existingMembership) {
          await db.$transaction([
            db.branchMember.create({
              data: {
                userId: invitationUser.id,
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
                receiverId: invitationUser.id,
              },
            }),
          ]);
        }

        // Always redirect to profile creation for invitation users
        redirect(
          `/profile/create?invitation=${invitationToken}&branch=${invitation.branchId}`
        );
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

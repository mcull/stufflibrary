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

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Normal callback flow - determine where to redirect authenticated users
  const userId = (session.user as { id?: string }).id;
  const userEmail = session.user?.email;

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

  // If there's an invitation token, handle the redirect to profile creation with branch info
  if (invitationToken && user) {
    const branchId = params.branch as string;

    if (user.profileCompleted) {
      // Get user's first name for welcome banner
      const fullUser = await db.user.findUnique({
        where: { id: user.id },
        select: { name: true },
      });
      const firstName = fullUser?.name?.split(' ')[0] || '';
      const welcomeUrl = new URL(
        `/branch/${branchId}`,
        'http://localhost:3000'
      );
      welcomeUrl.searchParams.set('message', 'joined_successfully');
      if (firstName) {
        welcomeUrl.searchParams.set('welcomeName', firstName);
      }
      redirect(welcomeUrl.toString().replace('http://localhost:3000', ''));
    } else {
      redirect(
        `/profile/create?invitation=${invitationToken}&branch=${branchId}`
      );
    }
  }

  // Normal redirect based on profile completion
  if (user?.profileCompleted) {
    redirect('/lobby');
  }
  redirect('/profile/create');
}

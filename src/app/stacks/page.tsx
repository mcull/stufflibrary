import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { LobbyClient } from '@/components/LobbyClient';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

interface LobbyPageProps {
  searchParams: Promise<{ welcome?: string }>;
}

export default async function LobbyPage({ searchParams }: LobbyPageProps) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Try different ways to get user ID
  const userId =
    (session.user as any).id ||
    (session as any).user?.id ||
    (session as any).userId;

  // Find user by ID or email
  let user;
  if (userId) {
    user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        shareInterests: true,
        borrowInterests: true,
        profileCompleted: true,
        createdAt: true,
      },
    });
  } else if (session.user?.email) {
    user = await db.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        shareInterests: true,
        borrowInterests: true,
        profileCompleted: true,
        createdAt: true,
      },
    });
  }

  if (!user) {
    redirect('/auth/signin');
  }

  // If profile is not completed, redirect to profile creation
  if (!user.profileCompleted) {
    redirect('/profile/create');
  }

  // Show welcome message only when redirected from profile creation
  const showWelcome = params.welcome === 'true';

  return <LobbyClient user={user} showWelcome={showWelcome} />;
}

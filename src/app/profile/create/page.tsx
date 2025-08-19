import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Suspense } from 'react';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

import { ProfileCreationHandler } from './ProfileCreationHandler';

export default async function CreateProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Try different ways to get user ID
  const userId =
    (session.user as any).id ||
    (session as any).user?.id ||
    (session as any).userId;

  // If no user ID, try to find user by email
  let user;
  if (userId) {
    user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        profileCompleted: true,
        onboardingStep: true,
        name: true,
        bio: true,
        interests: true,
        createdAt: true,
      },
    });
  } else if (session.user?.email) {
    user = await db.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        profileCompleted: true,
        onboardingStep: true,
        name: true,
        bio: true,
        interests: true,
        createdAt: true,
      },
    });
  } else {
    redirect('/auth/signin');
  }

  // If user already has a completed profile, redirect to dashboard
  if (user?.profileCompleted) {
    redirect('/dashboard');
  }

  // Pre-populate form with any existing data
  const initialData = {
    name: user?.name || '',
    bio: user?.bio || '',
    interests: user?.interests || [],
  };

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfileCreationHandler
        userId={user?.id || userId}
        initialData={initialData}
        user={
          user
            ? {
                id: user.id,
                name: user.name || '',
                email: session.user.email || '',
                image: session.user.image ?? undefined,
                createdAt: user.createdAt.toISOString(),
                profileCompleted: user.profileCompleted,
              }
            : undefined
        }
      />
    </Suspense>
  );
}

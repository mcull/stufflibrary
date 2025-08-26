import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { ProfileView } from '@/components/ProfileView';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Get user ID from session
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
        onboardingStep: true,
        currentAddressId: true,
        createdAt: true,
        updatedAt: true,
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
        onboardingStep: true,
        currentAddressId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  if (!user) {
    redirect('/auth/signin');
  }

  // If profile isn't completed, redirect to profile creation
  if (!user.profileCompleted) {
    redirect('/profile/create');
  }

  // Get current address if user has one
  let currentAddress = null;
  if (user?.currentAddressId) {
    currentAddress = await db.address.findUnique({
      where: { id: user.currentAddressId },
      select: {
        formattedAddress: true,
        address1: true,
        address2: true,
        city: true,
        state: true,
        zip: true,
      },
    });
  }

  return <ProfileView user={user} currentAddress={currentAddress} />;
}

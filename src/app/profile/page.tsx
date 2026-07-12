import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { ProfileView } from '@/components/ProfileView';
import { authOptions } from '@/lib/auth';
import { hasMinimalProfile } from '@/lib/capabilities';
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
        phone: true,
        smsOptIn: true,
        shareInterests: true,
        borrowInterests: true,
        profileCompleted: true,
        agreedToTermsAt: true,
        onboardingStep: true,
        currentAddressId: true,
        trustScore: true,
        trustTier: true,
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
        phone: true,
        smsOptIn: true,
        shareInterests: true,
        borrowInterests: true,
        profileCompleted: true,
        agreedToTermsAt: true,
        onboardingStep: true,
        currentAddressId: true,
        trustScore: true,
        trustTier: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  if (!user) {
    redirect('/auth/signin');
  }

  // If the user hasn't done the minimal onboarding, redirect to profile creation
  if (!hasMinimalProfile(user)) {
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

  // Compute stats: total items available to share
  const itemsAvailableCount = await db.item.count({
    where: {
      ownerId: user.id,
      currentBorrowRequestId: null,
    },
  });

  return (
    <ProfileView
      user={user}
      currentAddress={currentAddress}
      itemsAvailableCount={itemsAvailableCount}
    />
  );
}

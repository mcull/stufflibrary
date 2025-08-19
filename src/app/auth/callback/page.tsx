import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export default async function AuthCallbackPage() {
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
        profileCompleted: true,
      },
    });
  } else if (session.user?.email) {
    user = await db.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        profileCompleted: true,
      },
    });
  }

  // Redirect based on profile completion status
  if (user?.profileCompleted) {
    redirect('/dashboard');
  } else {
    redirect('/profile/create');
  }
}

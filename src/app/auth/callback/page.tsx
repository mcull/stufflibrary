import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export default async function AuthCallbackPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
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

  if (user?.profileCompleted) {
    redirect('/lobby');
  }
  redirect('/profile/create');
}

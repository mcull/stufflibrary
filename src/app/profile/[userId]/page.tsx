import { notFound } from 'next/navigation';

import { PublicProfileView } from '@/components/PublicProfileView';
import { db } from '@/lib/db';

interface PublicProfilePageProps {
  params: Promise<{ userId: string }>;
}

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const { userId } = await params;

  // Fetch user data
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      image: true,
      bio: true,
      shareInterests: true,
      createdAt: true,
      items: {
        where: {
          currentBorrowRequestId: null, // Only show available items on public profile
        },
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          condition: true,
          category: true,
          stuffType: {
            select: {
              displayName: true,
              category: true,
            },
          },
        },
        take: 12, // Limit to first 12 items
        orderBy: {
          createdAt: 'desc',
        },
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  return <PublicProfileView user={user as any} />;
}

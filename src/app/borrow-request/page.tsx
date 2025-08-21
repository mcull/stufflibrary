import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { BorrowRequestClient } from '@/components/BorrowRequestClient';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

interface BorrowRequestPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BorrowRequestPage({
  searchParams,
}: BorrowRequestPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  const resolvedSearchParams = await searchParams;
  const itemId = resolvedSearchParams?.item as string;

  if (!itemId) {
    redirect('/lobby');
  }

  // Get the item details
  const item = await db.item.findUnique({
    where: { id: itemId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      stuffType: {
        select: {
          displayName: true,
          category: true,
          iconPath: true,
        },
      },
    },
  });

  if (!item) {
    redirect('/lobby');
  }

  // Get current user ID
  const userId =
    (session.user as any).id ||
    (session as any).user?.id ||
    (session as any).userId;

  // Don't let users borrow their own items
  if (item.ownerId === userId) {
    redirect(`/stuff/${itemId}`);
  }

  return <BorrowRequestClient item={item} />;
}

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { CollectionDetailClient } from '@/components/CollectionDetailClient';
import { authOptions } from '@/lib/auth';

interface LibraryPageProps {
  params: Promise<{ id: string }>;
}

export default async function LibraryPage({ params }: LibraryPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  const { id: libraryId } = await params;

  return <CollectionDetailClient collectionId={libraryId} />;
}

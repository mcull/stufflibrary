import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { CollectionDetailClient } from '@/components/CollectionDetailClient';
import { authOptions } from '@/lib/auth';

interface CollectionPageProps {
  params: Promise<{ id: string }>;
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  const { id: collectionId } = await params;

  return <CollectionDetailClient collectionId={collectionId} />;
}

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { CollectionDetailClient } from '@/components/CollectionDetailClient';
import { authOptions } from '@/lib/auth';

interface CollectionPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ guest?: string }>;
}

export default async function CollectionPage({
  params,
  searchParams,
}: CollectionPageProps) {
  const session = await getServerSession(authOptions);
  const { guest } = await searchParams;

  if (!session?.user && !guest) {
    const cookieStore = await cookies();
    const inviteToken = cookieStore.get('invite_token')?.value;
    const inviteLibrary = cookieStore.get('invite_library')?.value;
    console.log('[collection page] redirecting to signin (no session)', {
      hasInviteToken: !!inviteToken,
      inviteLibrary,
    });
    redirect('/auth/signin');
  }

  const { id: collectionId } = await params;

  return <CollectionDetailClient collectionId={collectionId} />;
}

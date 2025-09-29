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
    const { id: collectionIdForCheck } = await params;
    const allowGuest = inviteToken && inviteLibrary === collectionIdForCheck;
    console.log('[collection page] auth gate', {
      hasSessionUser: !!session?.user,
      guestParam: guest,
      hasInviteToken: !!inviteToken,
      inviteLibrary,
      collectionIdForCheck,
      allowGuest,
    });
    if (!allowGuest) {
      redirect('/auth/signin');
    }
  }

  const { id: collectionId } = await params;

  return <CollectionDetailClient collectionId={collectionId} />;
}

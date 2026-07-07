import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { CollectionDetailClient } from '@/components/CollectionDetailClient';
import { authOptions } from '@/lib/auth';

// The one canonical library page (#399). Absorbed the guest/invite-cookie
// gate from the old /collection/[id] route so previously-sent invite links
// (which land guests here via 301) keep working.

interface LibraryPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ guest?: string }>;
}

export default async function LibraryPage({
  params,
  searchParams,
}: LibraryPageProps) {
  const session = await getServerSession(authOptions);
  const { guest } = await searchParams;

  if (!session?.user && !guest) {
    const cookieStore = await cookies();
    const inviteToken = cookieStore.get('invite_token')?.value;
    const inviteLibrary = cookieStore.get('invite_library')?.value;
    const { id: libraryIdForCheck } = await params;
    const allowGuest = inviteToken && inviteLibrary === libraryIdForCheck;
    console.log('[library page] auth gate', {
      hasSessionUser: !!session?.user,
      guestParam: guest,
      hasInviteToken: !!inviteToken,
      inviteLibrary,
      libraryIdForCheck,
      allowGuest,
    });
    if (!allowGuest) {
      redirect('/auth/signin');
    }
  }

  const { id: libraryId } = await params;

  return <CollectionDetailClient collectionId={libraryId} />;
}

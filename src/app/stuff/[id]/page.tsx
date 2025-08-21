import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { ItemDetailClient } from '@/components/ItemDetailClient';
import { authOptions } from '@/lib/auth';

interface ItemPageProps {
  params: Promise<{ id: string }>;
}

export default async function ItemPage({ params }: ItemPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  const { id: itemId } = await params;

  return <ItemDetailClient itemId={itemId} />;
}

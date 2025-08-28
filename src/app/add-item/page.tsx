import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { AddItemClient } from '@/components/AddItemClient';
import { authOptions } from '@/lib/auth';

interface AddItemPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AddItemPage({ searchParams }: AddItemPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  const resolvedSearchParams = await searchParams;
  const libraryId = resolvedSearchParams?.library as string;

  return <AddItemClient libraryId={libraryId} />;
}

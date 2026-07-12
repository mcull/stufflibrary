import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { BatchAddClient } from '@/components/BatchAddClient';
import { authOptions } from '@/lib/auth';

interface BatchAddPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BatchAddPage({
  searchParams,
}: BatchAddPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  const resolvedSearchParams = await searchParams;
  const libraryId = resolvedSearchParams?.library as string | undefined;

  return <BatchAddClient libraryId={libraryId} />;
}

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { ItemDetailClient } from '@/components/ItemDetailClient';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

interface ItemPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ItemPage({
  params,
  searchParams,
}: ItemPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  const { id: itemId } = await params;
  const resolvedSearchParams = await searchParams;
  const isNewItem = resolvedSearchParams?.new === 'true';
  const refSource =
    (resolvedSearchParams?.src as 'library' | 'mystuff' | undefined) ?? null;
  const refLibraryId =
    (resolvedSearchParams?.lib as string | undefined) ?? null;

  // Resolve the referring library's name so the breadcrumb reads
  // "Home / Libraries / Audit Test Shelf / …" instead of "Current Library".
  const refLibrary = refLibraryId
    ? await db.collection.findUnique({
        where: { id: refLibraryId },
        select: { name: true },
      })
    : null;

  return (
    <ItemDetailClient
      itemId={itemId}
      isNewItem={isNewItem}
      refSource={refSource}
      refLibraryId={refLibraryId}
      refLibraryName={refLibrary?.name ?? null}
    />
  );
}

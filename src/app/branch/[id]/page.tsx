import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { BranchDetailClient } from '@/components/BranchDetailClient';
import { authOptions } from '@/lib/auth';

interface BranchPageProps {
  params: Promise<{ id: string }>;
}

export default async function BranchPage({ params }: BranchPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  const { id: branchId } = await params;

  return <BranchDetailClient branchId={branchId} />;
}

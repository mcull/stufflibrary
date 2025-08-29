import { Metadata } from 'next';

import { BorrowRequestDetail } from '@/components/lender/BorrowRequestDetail';

export const metadata: Metadata = {
  title: 'Review Request | StuffLibrary',
  description: 'Review and respond to a borrowing request',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BorrowRequestDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <BorrowRequestDetail requestId={id} />;
}
import { BorrowRequestDetail } from '@/components/borrower/BorrowRequestDetail';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BorrowRequestDetailPage({ params }: PageProps) {
  const { id } = await params;
  
  return <BorrowRequestDetail requestId={id} />;
}

export const metadata = {
  title: 'Borrow Request Details | Stuff Library',
  description: 'View and manage your borrow request',
};
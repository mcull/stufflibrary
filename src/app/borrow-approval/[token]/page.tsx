import { BorrowApprovalClient } from '@/components/BorrowApprovalClient';
import { db } from '@/lib/db';

interface BorrowApprovalPageProps {
  params: Promise<{ token: string }>;
}

export default async function BorrowApprovalPage({
  params,
}: BorrowApprovalPageProps) {
  const { token } = await params;

  // Find the borrow request by token
  const borrowRequest = await db.borrowRequest.findFirst({
    where: {
      id: token,
      status: 'PENDING', // Only allow responding to pending requests
    },
    include: {
      borrower: {
        select: {
          id: true,
          name: true,
          image: true,
          phone: true,
        },
      },
      lender: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      item: {
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          watercolorUrl: true,
          watercolorThumbUrl: true,
        },
      },
    },
  });

  if (!borrowRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Request Not Found</h1>
          <p className="text-gray-600 mb-4">
            This borrow request link is invalid or has already been responded
            to.
          </p>
        </div>
      </div>
    );
  }

  // Map fields to what BorrowApprovalClient expects
  const formattedBorrowRequest = {
    ...borrowRequest,
    promiseText: borrowRequest.requestMessage,
    promisedReturnBy: borrowRequest.requestedReturnDate,
  };

  return <BorrowApprovalClient borrowRequest={formattedBorrowRequest as any} />;
}

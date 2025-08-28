import type { BorrowRequestStatus } from '@prisma/client';

export interface BorrowRequest {
  id: string;
  status: BorrowRequestStatus;
  requestMessage?: string;
  lenderMessage?: string;
  videoUrl?: string;
  requestedReturnDate: string;
  actualReturnDate?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  returnedAt?: string;
  borrowerId: string;
  lenderId: string;
  itemId: string;
}

export interface BorrowRequestWithRelations extends BorrowRequest {
  borrower: {
    id: string;
    name: string | null;
    email: string | null;
  };
  lender: {
    id: string;
    name: string | null;
    email: string | null;
    phone?: string | null;
  };
  item: {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    condition: string;
    location?: string;
  };
}

export interface CreateBorrowRequestData {
  itemId: string;
  requestMessage?: string;
  videoUrl?: string;
  requestedReturnDate: string;
}

export interface UpdateBorrowRequestData {
  status?: BorrowRequestStatus;
  lenderMessage?: string;
  actualReturnDate?: string;
}

export interface BorrowRequestFilters {
  status?: BorrowRequestStatus[];
  borrowerId?: string;
  lenderId?: string;
  itemId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface BorrowRequestsResponse {
  requests: BorrowRequestWithRelations[];
  total: number;
  page: number;
  limit: number;
}

// Computed field helpers
export interface ItemAvailability {
  itemId: string;
  isAvailable: boolean;
  currentBorrowRequestId?: string;
  activeBorrowRequest?: Pick<
    BorrowRequestWithRelations,
    'id' | 'status' | 'borrower' | 'requestedReturnDate'
  >;
}

export { BorrowRequestStatus };

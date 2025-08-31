import { BorrowRequestStatus } from '@prisma/client';

export type ItemStatus = 'ready-to-lend' | 'on-loan' | 'offline';

export interface ItemWithStatus {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  currentBorrowRequestId?: string | null;
  condition: string;
  location?: string | null;
  createdAt: string;
  status: ItemStatus;
  borrower?: {
    id: string;
    name: string | null;
  } | null;
  borrowRequest?: {
    id: string;
    status: BorrowRequestStatus;
    requestedReturnDate: Date;
    createdAt: Date;
  } | null;
}

/**
 * Determine item status based on currentBorrowRequestId
 */
export function getItemStatus(
  currentBorrowRequestId: string | null
): ItemStatus {
  return currentBorrowRequestId ? 'on-loan' : 'ready-to-lend';
}

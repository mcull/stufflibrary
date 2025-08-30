import { BorrowRequestStatus } from '@prisma/client';
import { db } from './db';

export type ItemStatus = 'ready-to-lend' | 'on-loan';

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
export function getItemStatus(currentBorrowRequestId: string | null): ItemStatus {
  return currentBorrowRequestId ? 'on-loan' : 'ready-to-lend';
}

/**
 * Get items owned by user with their computed status
 */
export async function getUserItemsWithStatus(userId: string): Promise<{
  readyToLendItems: ItemWithStatus[];
  onLoanItems: ItemWithStatus[];
}> {
  const items = await db.item.findMany({
    where: { ownerId: userId },
    include: {
      borrowRequests: {
        where: {
          OR: [
            { status: 'APPROVED' },
            { status: 'ACTIVE' }
          ]
        },
        include: {
          borrower: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 1 // Get the most recent active/approved request
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const itemsWithStatus: ItemWithStatus[] = items.map(item => {
    const status = getItemStatus(item.currentBorrowRequestId);
    const activeBorrowRequest = item.borrowRequests[0];
    
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      currentBorrowRequestId: item.currentBorrowRequestId,
      condition: item.condition,
      location: item.location,
      createdAt: item.createdAt.toISOString(),
      status,
      borrower: activeBorrowRequest?.borrower || null,
      borrowRequest: activeBorrowRequest ? {
        id: activeBorrowRequest.id,
        status: activeBorrowRequest.status,
        requestedReturnDate: activeBorrowRequest.requestedReturnDate,
        createdAt: activeBorrowRequest.createdAt
      } : null
    };
  });

  return {
    readyToLendItems: itemsWithStatus.filter(item => item.status === 'ready-to-lend'),
    onLoanItems: itemsWithStatus.filter(item => item.status === 'on-loan')
  };
}

/**
 * Get borrowed items for a user (items they are borrowing from others)
 */
export async function getUserBorrowedItems(userId: string) {
  const borrowRequests = await db.borrowRequest.findMany({
    where: {
      borrowerId: userId,
      status: { in: ['APPROVED', 'ACTIVE'] }
    },
    include: {
      item: {
        select: {
          id: true,
          name: true,
          imageUrl: true
        }
      },
      lender: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return borrowRequests.map(request => ({
    id: request.id,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    requestedReturnDate: request.requestedReturnDate.toISOString(),
    actualReturnDate: request.actualReturnDate?.toISOString() || null,
    item: request.item,
    lender: request.lender
  }));
}

/**
 * Get summary counts for user's items
 */
export async function getUserItemsSummary(userId: string): Promise<{
  readyToLendCount: number;
  onLoanCount: number;
  borrowedCount: number;
}> {
  const [ownedItems, borrowedRequests] = await Promise.all([
    db.item.count({
      where: { ownerId: userId }
    }),
    db.borrowRequest.count({
      where: {
        borrowerId: userId,
        status: { in: ['APPROVED', 'ACTIVE'] }
      }
    })
  ]);

  const onLoanCount = await db.item.count({
    where: {
      ownerId: userId,
      currentBorrowRequestId: { not: null }
    }
  });

  return {
    readyToLendCount: ownedItems - onLoanCount,
    onLoanCount,
    borrowedCount: borrowedRequests
  };
}
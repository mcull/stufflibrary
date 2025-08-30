import { BorrowRequestStatus } from '@prisma/client';

import { logAuditEntry, logItemAvailabilityChange } from './audit-log';
import { db } from './db';

/**
 * Check if an item is available for borrowing
 */
export async function isItemAvailable(itemId: string): Promise<boolean> {
  const item = await db.item.findUnique({
    where: { id: itemId },
    select: {
      currentBorrowRequestId: true,
      borrowRequests: {
        where: {
          status: { in: ['PENDING', 'APPROVED', 'ACTIVE'] },
        },
        select: { id: true, status: true },
      },
    },
  });

  if (!item) {
    return false;
  }

  // Item is unavailable if it has a current borrow request
  // or has any active/pending/approved requests
  return !item.currentBorrowRequestId && item.borrowRequests.length === 0;
}

/**
 * Update item's current borrow request when status changes
 */
export async function updateItemAvailability(
  itemId: string,
  borrowRequestId: string,
  newStatus: BorrowRequestStatus,
  userId?: string
): Promise<void> {
  console.log(`🔧 DEBUG updateItemAvailability called:`, {
    itemId,
    borrowRequestId,
    newStatus,
    userId
  });

  // Get current state for audit logging
  const currentItem = await db.item.findUnique({
    where: { id: itemId },
    select: { currentBorrowRequestId: true },
  });

  console.log(`🔧 DEBUG current item state:`, {
    itemId,
    currentBorrowRequestId: currentItem?.currentBorrowRequestId,
  });

  const wasAvailable = !currentItem?.currentBorrowRequestId;

  // Set currentBorrowRequestId when request becomes APPROVED or ACTIVE
  // Clear it when request is RETURNED, CANCELLED, or DECLINED
  if (['APPROVED', 'ACTIVE'].includes(newStatus)) {
    console.log(`🔧 DEBUG Setting currentBorrowRequestId to ${borrowRequestId} for status ${newStatus}`);
    await db.item.update({
      where: { id: itemId },
      data: { currentBorrowRequestId: borrowRequestId },
    });
    console.log(`🔧 DEBUG Successfully updated item ${itemId} with borrowRequestId ${borrowRequestId}`);
  } else if (['RETURNED', 'CANCELLED', 'DECLINED'].includes(newStatus)) {
    console.log(`🔧 DEBUG Clearing currentBorrowRequestId for status ${newStatus}`);
    await db.item.update({
      where: { id: itemId },
      data: { currentBorrowRequestId: null },
    });
    console.log(`🔧 DEBUG Successfully cleared currentBorrowRequestId for item ${itemId}`);
  } else {
    console.log(`🔧 DEBUG No action needed for status ${newStatus}`);
  }

  // Log availability change if userId provided
  if (userId) {
    const isNowAvailable = ['RETURNED', 'CANCELLED', 'DECLINED'].includes(
      newStatus
    );

    if (wasAvailable !== isNowAvailable) {
      await logItemAvailabilityChange(
        itemId,
        userId,
        borrowRequestId,
        newStatus,
        wasAvailable,
        isNowAvailable
      );
    }
  }
}

/**
 * Get computed availability status for an item
 */
export async function getItemAvailability(itemId: string) {
  const item = await db.item.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      currentBorrowRequestId: true,
      borrowRequests: {
        where: {
          status: { in: ['PENDING', 'APPROVED', 'ACTIVE'] },
        },
        include: {
          borrower: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!item) {
    return null;
  }

  const isAvailable =
    !item.currentBorrowRequestId && item.borrowRequests.length === 0;
  const activeBorrowRequest = item.borrowRequests[0] || null;

  return {
    itemId: item.id,
    isAvailable,
    currentBorrowRequestId: item.currentBorrowRequestId,
    activeBorrowRequest,
  };
}

/**
 * Create a new borrow request with proper validations
 */
export async function createBorrowRequest({
  borrowerId,
  itemId,
  requestMessage,
  videoUrl,
  requestedReturnDate,
}: {
  borrowerId: string;
  itemId: string;
  requestMessage?: string;
  videoUrl?: string;
  requestedReturnDate: Date;
}) {
  // Check if item exists and get owner
  const item = await db.item.findUnique({
    where: { id: itemId },
    include: {
      owner: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
  });

  if (!item) {
    throw new Error('Item not found');
  }

  if (item.ownerId === borrowerId) {
    throw new Error('Cannot borrow your own item');
  }

  // Check if item is available
  const available = await isItemAvailable(itemId);
  if (!available) {
    throw new Error('Item is not available for borrowing');
  }

  // Create the borrow request
  const borrowRequest = await db.borrowRequest.create({
    data: {
      borrowerId,
      lenderId: item.ownerId,
      itemId,
      requestMessage: requestMessage || null,
      videoUrl: videoUrl || null,
      requestedReturnDate,
      status: 'PENDING',
    },
    include: {
      borrower: {
        select: { id: true, name: true, email: true },
      },
      lender: {
        select: { id: true, name: true, email: true, phone: true },
      },
      item: {
        select: { id: true, name: true, imageUrl: true },
      },
    },
  });

  // Log the creation
  await logAuditEntry({
    action: 'BORROW_REQUEST_CREATED',
    userId: borrowerId,
    entityType: 'BORROW_REQUEST',
    entityId: borrowRequest.id,
    details: {
      itemId,
      itemName: item.name,
      lenderId: item.ownerId,
      requestedReturnDate: requestedReturnDate.toISOString(),
      hasMessage: !!requestMessage,
      hasVideo: !!videoUrl,
    },
  });

  return borrowRequest;
}

/**
 * Update borrow request status with proper side effects
 */
export async function updateBorrowRequestStatus({
  borrowRequestId,
  newStatus,
  lenderMessage,
  actualReturnDate,
}: {
  borrowRequestId: string;
  newStatus: BorrowRequestStatus;
  lenderMessage?: string;
  actualReturnDate?: Date;
}) {
  const borrowRequest = await db.borrowRequest.findUnique({
    where: { id: borrowRequestId },
    include: { item: { select: { id: true } } },
  });

  if (!borrowRequest) {
    throw new Error('Borrow request not found');
  }

  // Update the borrow request
  const updatedRequest = await db.borrowRequest.update({
    where: { id: borrowRequestId },
    data: {
      status: newStatus,
      lenderMessage: lenderMessage || null,
      actualReturnDate: actualReturnDate || null,
      approvedAt: newStatus === 'APPROVED' ? new Date() : null,
      returnedAt: newStatus === 'RETURNED' ? new Date() : null,
    },
  });

  // Update item availability
  await updateItemAvailability(
    borrowRequest.item.id,
    borrowRequestId,
    newStatus
  );

  return updatedRequest;
}

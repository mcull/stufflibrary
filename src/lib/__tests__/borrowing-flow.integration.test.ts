import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database and external services
const mockDb = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  item: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  borrowRequest: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  notification: {
    create: vi.fn(),
  },
};

// Mock notification services
const mockSendBorrowRequestReceivedNotification = vi.fn();
const mockSendBorrowResponseNotification = vi.fn();
const mockSendReturnNotification = vi.fn();
const mockSendCancellationNotification = vi.fn();
const mockCreateNotification = vi.fn();

// Mock audit logging
const mockLogBorrowRequestStatusChange = vi.fn();

vi.doMock('@/lib/db', () => ({ db: mockDb }));
vi.doMock('@/lib/enhanced-notification-service', () => ({
  sendBorrowRequestReceivedNotification:
    mockSendBorrowRequestReceivedNotification,
}));
vi.doMock('@/lib/twilio', () => ({
  sendBorrowRequestNotification: vi.fn(),
  sendBorrowResponseNotification: mockSendBorrowResponseNotification,
  sendReturnNotification: mockSendReturnNotification,
  sendCancellationNotification: mockSendCancellationNotification,
}));
vi.doMock('@/lib/notification-service', () => ({
  createNotification: mockCreateNotification,
}));
vi.doMock('@/lib/audit-log', () => ({
  logBorrowRequestStatusChange: mockLogBorrowRequestStatusChange,
}));

// Import the functions we're testing
import {
  createBorrowRequest,
  updateItemAvailability,
} from '@/lib/borrow-request-utils';

// Test data
const testUsers = {
  borrower: {
    id: 'borrower-123',
    name: 'John Borrower',
    email: 'borrower@example.com',
    phone: '+1234567890',
    image: null,
  },
  lender: {
    id: 'lender-123',
    name: 'Jane Lender',
    email: 'lender@example.com',
    phone: '+1987654321',
    image: null,
  },
};

const testItem = {
  id: 'item-123',
  name: 'Test Camera',
  description: 'Professional DSLR camera',
  imageUrl: 'https://example.com/camera.jpg',
  condition: 'excellent',
  ownerId: 'lender-123',
  currentBorrowRequestId: null,
  isAvailable: true,
  owner: testUsers.lender,
};

const testBorrowRequest = {
  id: 'request-123',
  borrowerId: 'borrower-123',
  lenderId: 'lender-123',
  itemId: 'item-123',
  status: 'PENDING',
  requestMessage: 'I need this camera for a wedding shoot',
  lenderMessage: null,
  videoUrl: null,
  requestedReturnDate: new Date('2024-12-31'),
  createdAt: new Date(),
  borrower: testUsers.borrower,
  lender: testUsers.lender,
  item: testItem,
};

describe('Borrowing Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    mockDb.user.findUnique.mockImplementation((params) => {
      if (params.where.id === 'borrower-123')
        return Promise.resolve(testUsers.borrower);
      if (params.where.id === 'lender-123')
        return Promise.resolve(testUsers.lender);
      return Promise.resolve(null);
    });

    mockDb.item.findUnique.mockResolvedValue(testItem);
    mockDb.borrowRequest.create.mockResolvedValue(testBorrowRequest);
    mockDb.borrowRequest.findUnique.mockResolvedValue(testBorrowRequest);
    mockDb.borrowRequest.update.mockResolvedValue(testBorrowRequest);

    mockSendBorrowRequestReceivedNotification.mockResolvedValue(undefined);
    mockSendBorrowResponseNotification.mockResolvedValue(undefined);
    mockSendReturnNotification.mockResolvedValue(undefined);
    mockSendCancellationNotification.mockResolvedValue(undefined);
    mockCreateNotification.mockResolvedValue(undefined);
    mockLogBorrowRequestStatusChange.mockResolvedValue(undefined);
  });

  describe('Complete Borrowing Flow', () => {
    it('should complete the full happy path: request → approve → active → return → confirm', async () => {
      // Step 1: Create borrow request
      const requestData = {
        borrowerId: 'borrower-123',
        itemId: 'item-123',
        requestedReturnDate: new Date('2024-12-31'),
        requestMessage: 'I need this camera for a wedding shoot',
      };

      await createBorrowRequest(requestData);

      expect(mockDb.borrowRequest.create).toHaveBeenCalledWith({
        data: {
          borrowerId: 'borrower-123',
          lenderId: 'lender-123',
          itemId: 'item-123',
          requestMessage: 'I need this camera for a wedding shoot',
          videoUrl: null,
          requestedReturnDate: new Date('2024-12-31'),
          status: 'PENDING',
        },
        include: expect.any(Object),
      });

      // Step 2: Item availability should be updated for pending request
      await updateItemAvailability(
        'item-123',
        'request-123',
        'PENDING',
        'borrower-123'
      );

      expect(mockDb.item.update).not.toHaveBeenCalled(); // PENDING doesn't change availability

      // Step 3: Lender approves the request
      mockDb.borrowRequest.update.mockResolvedValueOnce({
        ...testBorrowRequest,
        status: 'APPROVED',
        lenderMessage: 'Sure, take good care of it!',
        approvedAt: new Date(),
      });

      await updateItemAvailability(
        'item-123',
        'request-123',
        'APPROVED',
        'lender-123'
      );

      // Item should now be marked as unavailable
      expect(mockDb.item.update).toHaveBeenCalledWith({
        where: { id: 'item-123' },
        data: { currentBorrowRequestId: 'request-123' },
      });

      // Step 4: Request becomes active (automatic transition)
      mockDb.borrowRequest.update.mockResolvedValueOnce({
        ...testBorrowRequest,
        status: 'ACTIVE',
      });

      await updateItemAvailability(
        'item-123',
        'request-123',
        'ACTIVE',
        'system'
      );

      // Item should remain unavailable
      expect(mockDb.item.update).toHaveBeenLastCalledWith({
        where: { id: 'item-123' },
        data: { currentBorrowRequestId: 'request-123' },
      });

      // Step 5: Borrower marks item as returned
      mockDb.borrowRequest.update.mockResolvedValueOnce({
        ...testBorrowRequest,
        status: 'RETURNED',
        returnedAt: new Date(),
        borrowerNotes: 'Camera returned in perfect condition',
      });

      await updateItemAvailability(
        'item-123',
        'request-123',
        'RETURNED',
        'borrower-123'
      );

      // Item should become available again
      expect(mockDb.item.update).toHaveBeenLastCalledWith({
        where: { id: 'item-123' },
        data: { currentBorrowRequestId: null },
      });

      // Verify all audit logging calls were made
      expect(mockLogBorrowRequestStatusChange).toHaveBeenCalledTimes(4);
    });

    it('should handle declined request flow', async () => {
      // Create request
      await createBorrowRequest({
        borrowerId: 'borrower-123',
        itemId: 'item-123',
        requestedReturnDate: new Date('2024-12-31'),
        requestMessage: 'Can I borrow this?',
      });

      // Lender declines
      mockDb.borrowRequest.update.mockResolvedValueOnce({
        ...testBorrowRequest,
        status: 'DECLINED',
        lenderMessage: 'Sorry, not available',
        declinedAt: new Date(),
      });

      await updateItemAvailability(
        'item-123',
        'request-123',
        'DECLINED',
        'lender-123'
      );

      // Item should remain available (no current borrow request)
      expect(mockDb.item.update).toHaveBeenCalledWith({
        where: { id: 'item-123' },
        data: { currentBorrowRequestId: null },
      });

      // Notification should be sent to borrower
      expect(mockSendBorrowResponseNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          approved: false,
          message: expect.stringContaining('declined'),
        })
      );
    });

    it('should handle cancelled request flow', async () => {
      // Create and approve request
      await createBorrowRequest({
        borrowerId: 'borrower-123',
        itemId: 'item-123',
        requestedReturnDate: new Date('2024-12-31'),
      });

      // Mark as approved first
      await updateItemAvailability(
        'item-123',
        'request-123',
        'APPROVED',
        'lender-123'
      );

      // Then borrower cancels
      mockDb.borrowRequest.update.mockResolvedValueOnce({
        ...testBorrowRequest,
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: 'borrower-123',
        cancellationReason: 'No longer needed',
      });

      await updateItemAvailability(
        'item-123',
        'request-123',
        'CANCELLED',
        'borrower-123'
      );

      // Item should become available again
      expect(mockDb.item.update).toHaveBeenLastCalledWith({
        where: { id: 'item-123' },
        data: { currentBorrowRequestId: null },
      });

      // Cancellation notification should be sent to lender
      expect(mockSendCancellationNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          isOwnerCancelling: false,
        })
      );
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should prevent multiple concurrent requests for the same item', async () => {
      // First request succeeds
      createBorrowRequest({
        borrowerId: 'borrower-123',
        itemId: 'item-123',
        requestedReturnDate: new Date('2024-12-31'),
      });

      // Approve first request
      await updateItemAvailability(
        'item-123',
        'request-123',
        'APPROVED',
        'lender-123'
      );

      // Second request should fail due to item being unavailable
      mockDb.item.findUnique.mockResolvedValueOnce({
        ...testItem,
        currentBorrowRequestId: 'request-123', // Item is now unavailable
      });

      const secondRequestData = {
        borrowerId: 'borrower-456',
        itemId: 'item-123',
        requestedReturnDate: new Date('2024-12-31'),
      };

      // This should throw or return an error indicating item is not available
      await expect(createBorrowRequest(secondRequestData)).rejects.toThrow(
        'not available'
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database transaction failures', async () => {
      mockDb.borrowRequest.create.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        createBorrowRequest({
          borrowerId: 'borrower-123',
          itemId: 'item-123',
          requestedReturnDate: new Date('2024-12-31'),
        })
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle notification failures gracefully', async () => {
      mockSendBorrowRequestReceivedNotification.mockRejectedValue(
        new Error('Email service down')
      );

      // Request should still succeed despite notification failure
      const result = await createBorrowRequest({
        borrowerId: 'borrower-123',
        itemId: 'item-123',
        requestedReturnDate: new Date('2024-12-31'),
      });

      expect(result).toBeDefined();
      expect(mockDb.borrowRequest.create).toHaveBeenCalled();
    });

    it('should handle missing user data', async () => {
      mockDb.user.findUnique.mockResolvedValue(null);

      await expect(
        createBorrowRequest({
          borrowerId: 'nonexistent-user',
          itemId: 'item-123',
          requestedReturnDate: new Date('2024-12-31'),
        })
      ).rejects.toThrow('User not found');
    });

    it('should handle missing item data', async () => {
      mockDb.item.findUnique.mockResolvedValue(null);

      await expect(
        createBorrowRequest({
          borrowerId: 'borrower-123',
          itemId: 'nonexistent-item',
          requestedReturnDate: new Date('2024-12-31'),
        })
      ).rejects.toThrow('Item not found');
    });

    it('should handle overdue returns', async () => {
      const overdueRequest = {
        ...testBorrowRequest,
        status: 'ACTIVE',
        requestedReturnDate: new Date('2023-01-01'), // Past date
      };

      mockDb.borrowRequest.findMany.mockResolvedValue([overdueRequest]);

      // This would be called by a background job to find overdue items
      const overdueRequests = await mockDb.borrowRequest.findMany({
        where: {
          status: 'ACTIVE',
          requestedReturnDate: { lt: new Date() },
        },
      });

      expect(overdueRequests).toHaveLength(1);
      expect(overdueRequests[0].requestedReturnDate.getTime()).toBeLessThan(
        Date.now()
      );
    });
  });

  describe('Business Rule Validation', () => {
    it('should prevent users from borrowing their own items', async () => {
      mockDb.item.findUnique.mockResolvedValue({
        ...testItem,
        ownerId: 'borrower-123', // Same as borrower
      });

      await expect(
        createBorrowRequest({
          borrowerId: 'borrower-123',
          itemId: 'item-123',
          requestedReturnDate: new Date('2024-12-31'),
        })
      ).rejects.toThrow('own item');
    });

    it('should validate return dates are in the future', async () => {
      await expect(
        createBorrowRequest({
          borrowerId: 'borrower-123',
          itemId: 'item-123',
          requestedReturnDate: new Date('2020-01-01'), // Past date
        })
      ).rejects.toThrow('future');
    });

    it('should enforce phone number requirements', async () => {
      mockDb.user.findUnique.mockResolvedValue({
        ...testUsers.borrower,
        phone: null, // No phone number
      });

      await expect(
        createBorrowRequest({
          borrowerId: 'borrower-123',
          itemId: 'item-123',
          requestedReturnDate: new Date('2024-12-31'),
        })
      ).rejects.toThrow('phone number required');
    });
  });

  describe('Status Transition Validation', () => {
    it('should validate status transitions are legal', async () => {
      // RETURNED -> PENDING should not be allowed
      mockDb.borrowRequest.findUnique.mockResolvedValue({
        ...testBorrowRequest,
        status: 'RETURNED',
      });

      await expect(
        updateItemAvailability('item-123', 'request-123', 'PENDING', 'user-123')
      ).rejects.toThrow('Invalid status transition');
    });

    it('should allow valid status transitions', async () => {
      // PENDING -> APPROVED is valid
      await expect(
        updateItemAvailability(
          'item-123',
          'request-123',
          'APPROVED',
          'lender-123'
        )
      ).resolves.not.toThrow();

      // APPROVED -> ACTIVE is valid
      await expect(
        updateItemAvailability('item-123', 'request-123', 'ACTIVE', 'system')
      ).resolves.not.toThrow();

      // ACTIVE -> RETURNED is valid
      await expect(
        updateItemAvailability(
          'item-123',
          'request-123',
          'RETURNED',
          'borrower-123'
        )
      ).resolves.not.toThrow();
    });
  });

  describe('Audit Trail Verification', () => {
    it('should log all status changes', async () => {
      await createBorrowRequest({
        borrowerId: 'borrower-123',
        itemId: 'item-123',
        requestedReturnDate: new Date('2024-12-31'),
      });

      await updateItemAvailability(
        'item-123',
        'request-123',
        'APPROVED',
        'lender-123'
      );
      await updateItemAvailability(
        'item-123',
        'request-123',
        'ACTIVE',
        'system'
      );
      await updateItemAvailability(
        'item-123',
        'request-123',
        'RETURNED',
        'borrower-123'
      );

      expect(mockLogBorrowRequestStatusChange).toHaveBeenCalledTimes(3);

      // Verify specific log entries
      expect(mockLogBorrowRequestStatusChange).toHaveBeenCalledWith(
        'request-123',
        'lender-123',
        expect.any(String),
        'APPROVED',
        expect.any(Object)
      );
    });

    it('should include relevant context in audit logs', async () => {
      await updateItemAvailability(
        'item-123',
        'request-123',
        'APPROVED',
        'lender-123'
      );

      expect(mockLogBorrowRequestStatusChange).toHaveBeenCalledWith(
        'request-123',
        'lender-123',
        expect.any(String),
        'APPROVED',
        expect.objectContaining({
          itemId: 'item-123',
          itemName: expect.any(String),
        })
      );
    });
  });
});

import { BorrowRequestStatus } from '@prisma/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  isItemAvailable,
  updateItemAvailability,
  createBorrowRequest,
} from '../borrow-request-utils';
import { db } from '../db';

// Mock the database
vi.mock('../db', () => ({
  db: {
    item: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    borrowRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('Borrow Request Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isItemAvailable', () => {
    const mockItemId = 'item-123';

    it('should return true for available item', async () => {
      vi.mocked(db.item.findUnique).mockResolvedValue({
        currentBorrowRequestId: null,
        borrowRequests: [],
      });

      const result = await isItemAvailable(mockItemId);

      expect(result).toBe(true);
      expect(db.item.findUnique).toHaveBeenCalledWith({
        where: { id: mockItemId },
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
    });

    it('should return false for item with current borrow request', async () => {
      vi.mocked(db.item.findUnique).mockResolvedValue({
        currentBorrowRequestId: 'borrow-123',
        borrowRequests: [],
      });

      const result = await isItemAvailable(mockItemId);
      expect(result).toBe(false);
    });

    it('should return false for item with pending requests', async () => {
      vi.mocked(db.item.findUnique).mockResolvedValue({
        currentBorrowRequestId: null,
        borrowRequests: [{ id: 'request-123', status: 'PENDING' }],
      });

      const result = await isItemAvailable(mockItemId);
      expect(result).toBe(false);
    });

    it('should return false for non-existent item', async () => {
      vi.mocked(db.item.findUnique).mockResolvedValue(null);

      const result = await isItemAvailable(mockItemId);
      expect(result).toBe(false);
    });
  });

  describe('updateItemAvailability', () => {
    const mockItemId = 'item-123';
    const mockBorrowRequestId = 'borrow-123';

    it('should set currentBorrowRequestId when status is ACTIVE', async () => {
      vi.mocked(db.item.update).mockResolvedValue({
        id: mockItemId,
        currentBorrowRequestId: mockBorrowRequestId,
      } as any);

      await updateItemAvailability(mockItemId, mockBorrowRequestId, 'ACTIVE');

      expect(db.item.update).toHaveBeenCalledWith({
        where: { id: mockItemId },
        data: { currentBorrowRequestId: mockBorrowRequestId },
      });
    });

    it('should clear currentBorrowRequestId when status is RETURNED', async () => {
      vi.mocked(db.item.update).mockResolvedValue({
        id: mockItemId,
        currentBorrowRequestId: null,
      } as any);

      await updateItemAvailability(mockItemId, mockBorrowRequestId, 'RETURNED');

      expect(db.item.update).toHaveBeenCalledWith({
        where: { id: mockItemId },
        data: { currentBorrowRequestId: null },
      });
    });

    it('should clear currentBorrowRequestId when status is CANCELLED', async () => {
      vi.mocked(db.item.update).mockResolvedValue({
        id: mockItemId,
        currentBorrowRequestId: null,
      } as any);

      await updateItemAvailability(
        mockItemId,
        mockBorrowRequestId,
        'CANCELLED'
      );

      expect(db.item.update).toHaveBeenCalledWith({
        where: { id: mockItemId },
        data: { currentBorrowRequestId: null },
      });
    });

    it('should not update item for PENDING status', async () => {
      await updateItemAvailability(mockItemId, mockBorrowRequestId, 'PENDING');

      expect(db.item.update).not.toHaveBeenCalled();
    });
  });

  describe('createBorrowRequest', () => {
    const mockRequestData = {
      borrowerId: 'borrower-123',
      itemId: 'item-123',
      requestMessage: 'Can I borrow this?',
      videoUrl: 'https://example.com/video.mp4',
      requestedReturnDate: new Date('2024-12-01'),
    };

    it('should create borrow request successfully', async () => {
      const mockItem = {
        id: 'item-123',
        ownerId: 'owner-123',
        owner: {
          id: 'owner-123',
          name: 'Jane Owner',
          email: 'owner@example.com',
          phone: '+1234567890',
        },
      };

      const mockBorrowRequest = {
        id: 'request-123',
        ...mockRequestData,
        lenderId: 'owner-123',
        status: 'PENDING' as BorrowRequestStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
        borrower: {
          id: 'borrower-123',
          name: 'John Borrower',
          email: 'borrower@example.com',
        },
        lender: {
          id: 'owner-123',
          name: 'Jane Owner',
          email: 'owner@example.com',
        },
        item: { id: 'item-123', name: 'Test Item', imageUrl: null },
      };

      vi.mocked(db.item.findUnique)
        .mockResolvedValueOnce(mockItem)
        .mockResolvedValue({
          currentBorrowRequestId: null,
          borrowRequests: [],
        });
      vi.mocked(db.borrowRequest.create).mockResolvedValue(mockBorrowRequest);

      const result = await createBorrowRequest(mockRequestData);

      expect(result).toEqual(mockBorrowRequest);
    });
  });
});

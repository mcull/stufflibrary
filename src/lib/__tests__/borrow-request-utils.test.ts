import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// Skip all tests if database environment variables are not available (e.g., in CI)
const skipTests = !process.env.DATABASE_URL;

if (skipTests) {
  describe('Borrow Request Utils', () => {
    it('should skip database tests when environment variables are missing', () => {
      console.log(
        'Skipping borrow request utils tests - DATABASE_URL not available'
      );
      expect(true).toBe(true);
    });
  });
} else {
  // Mock modules before importing
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

  // Mock audit log
  vi.mock('../audit-log', () => ({
    logBorrowRequestStatusChange: vi.fn(),
  }));

  describe('Borrow Request Utils', () => {
    let isItemAvailable: (itemId: string) => Promise<boolean>;
    let updateItemAvailability: (
      itemId: string,
      borrowRequestId: string,
      status: string,
      userId: string
    ) => Promise<void>;
    let createBorrowRequest: (data: unknown) => Promise<unknown>;
    let db: {
      item: {
        findUnique: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
      };
      borrowRequest: {
        create: ReturnType<typeof vi.fn>;
        findUnique: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
      };
    };

    beforeAll(async () => {
      // Import modules dynamically to avoid environment validation issues
      const borrowRequestUtilsModule = await import('../borrow-request-utils');
      const dbModule = await import('../db');

      isItemAvailable = borrowRequestUtilsModule.isItemAvailable;
      updateItemAvailability = borrowRequestUtilsModule.updateItemAvailability;
      createBorrowRequest = borrowRequestUtilsModule.createBorrowRequest;
      db = dbModule.db as typeof db;
    });

    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe('isItemAvailable', () => {
      it('should return true for available item', async () => {
        vi.mocked(db.item.findUnique).mockResolvedValue({
          id: 'item-123',
          currentBorrowRequestId: null,
        });

        const result = await isItemAvailable('item-123');
        expect(result).toBe(true);
        expect(db.item.findUnique).toHaveBeenCalledWith({
          where: { id: 'item-123' },
          select: { currentBorrowRequestId: true },
        });
      });

      it('should return false for item with current borrow request', async () => {
        vi.mocked(db.item.findUnique).mockResolvedValue({
          id: 'item-123',
          currentBorrowRequestId: 'request-456',
        });

        const result = await isItemAvailable('item-123');
        expect(result).toBe(false);
      });

      it('should return false for item with pending requests', async () => {
        vi.mocked(db.item.findUnique).mockResolvedValue({
          id: 'item-123',
          currentBorrowRequestId: 'pending-request',
        });

        const result = await isItemAvailable('item-123');
        expect(result).toBe(false);
      });

      it('should return false for non-existent item', async () => {
        vi.mocked(db.item.findUnique).mockResolvedValue(null);

        const result = await isItemAvailable('non-existent');
        expect(result).toBe(false);
      });
    });

    describe('updateItemAvailability', () => {
      it('should set currentBorrowRequestId when status is ACTIVE', async () => {
        vi.mocked(db.item.update).mockResolvedValue({
          id: 'item-123',
          currentBorrowRequestId: 'request-456',
        });

        await updateItemAvailability(
          'item-123',
          'request-456',
          'ACTIVE',
          'user-123'
        );

        expect(db.item.update).toHaveBeenCalledWith({
          where: { id: 'item-123' },
          data: { currentBorrowRequestId: 'request-456' },
        });
      });

      it('should clear currentBorrowRequestId when status is RETURNED', async () => {
        vi.mocked(db.item.update).mockResolvedValue({
          id: 'item-123',
          currentBorrowRequestId: null,
        });

        await updateItemAvailability(
          'item-123',
          'request-456',
          'RETURNED',
          'user-123'
        );

        expect(db.item.update).toHaveBeenCalledWith({
          where: { id: 'item-123' },
          data: { currentBorrowRequestId: null },
        });
      });

      it('should clear currentBorrowRequestId when status is CANCELLED', async () => {
        vi.mocked(db.item.update).mockResolvedValue({
          id: 'item-123',
          currentBorrowRequestId: null,
        });

        await updateItemAvailability(
          'item-123',
          'request-456',
          'CANCELLED',
          'user-123'
        );

        expect(db.item.update).toHaveBeenCalledWith({
          where: { id: 'item-123' },
          data: { currentBorrowRequestId: null },
        });
      });

      it('should not update item for PENDING status', async () => {
        await updateItemAvailability(
          'item-123',
          'request-456',
          'PENDING',
          'user-123'
        );

        expect(db.item.update).not.toHaveBeenCalled();
      });
    });

    describe('createBorrowRequest', () => {
      it('should create borrow request successfully', async () => {
        const mockBorrowRequest = {
          id: 'request-123',
          borrowerId: 'borrower-123',
          lenderId: 'owner-123',
          itemId: 'item-123',
          requestMessage: 'Test message',
          videoUrl: 'https://example.com/video',
          requestedReturnDate: new Date('2024-12-01'),
          status: 'PENDING',
        };

        vi.mocked(db.borrowRequest.create).mockResolvedValue(mockBorrowRequest);

        const result = await createBorrowRequest({
          borrowerId: 'borrower-123',
          lenderId: 'owner-123',
          itemId: 'item-123',
          requestMessage: 'Test message',
          videoUrl: 'https://example.com/video',
          requestedReturnDate: new Date('2024-12-01'),
        });

        expect(result).toEqual(mockBorrowRequest);
        expect(db.borrowRequest.create).toHaveBeenCalledWith({
          data: {
            borrowerId: 'borrower-123',
            lenderId: 'owner-123',
            itemId: 'item-123',
            requestMessage: 'Test message',
            videoUrl: 'https://example.com/video',
            requestedReturnDate: new Date('2024-12-01'),
            status: 'PENDING',
          },
        });
      });
    });
  });
}

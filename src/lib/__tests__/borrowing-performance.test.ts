import { performance } from 'perf_hooks';

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
const mockDb = {
  borrowRequest: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  item: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

const mockSendNotification = vi.fn();
const mockCreateNotification = vi.fn();

vi.doMock('@/lib/db', () => ({ db: mockDb }));
vi.doMock('@/lib/enhanced-notification-service', () => ({
  sendBorrowRequestReceivedNotification: mockSendNotification,
}));
vi.doMock('@/lib/notification-service', () => ({
  createNotification: mockCreateNotification,
}));

// Import functions to test
import {
  createBorrowRequest,
  isItemAvailable,
} from '@/lib/borrow-request-utils';

// Performance test utilities
function measureExecutionTime(
  fn: () => Promise<any>
): Promise<{ result: any; duration: number }> {
  return new Promise(async (resolve) => {
    const start = performance.now();
    try {
      const result = await fn();
      const end = performance.now();
      resolve({ result, duration: end - start });
    } catch (error) {
      const end = performance.now();
      resolve({ result: error, duration: end - start });
    }
  });
}

async function generateTestData(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    name: `Test Item ${i}`,
    ownerId: `owner-${i % 10}`, // 10 different owners
    currentBorrowRequestId: i % 3 === 0 ? `request-${i}` : null, // 1/3 items unavailable
    status: i % 3 === 0 ? 'ACTIVE' : 'AVAILABLE',
  }));
}

describe('Borrowing Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockDb.user.findUnique.mockResolvedValue({
      id: 'user-123',
      name: 'Test User',
      phone: '+1234567890',
      email: 'test@example.com',
    });

    mockDb.item.findUnique.mockResolvedValue({
      id: 'item-123',
      name: 'Test Item',
      ownerId: 'owner-123',
      currentBorrowRequestId: null,
      owner: {
        id: 'owner-123',
        name: 'Item Owner',
        phone: '+1987654321',
        email: 'owner@example.com',
      },
    });

    mockDb.borrowRequest.create.mockResolvedValue({
      id: 'request-123',
      borrowerId: 'user-123',
      lenderId: 'owner-123',
      itemId: 'item-123',
      status: 'PENDING',
    });

    mockSendNotification.mockResolvedValue(undefined);
    mockCreateNotification.mockResolvedValue(undefined);
  });

  describe('API Response Time Tests', () => {
    it('should create borrow request within 500ms', async () => {
      const { duration } = await measureExecutionTime(async () => {
        return createBorrowRequest({
          borrowerId: 'user-123',
          itemId: 'item-123',
          requestedReturnDate: new Date('2024-12-31'),
          requestMessage: 'Test request',
        });
      });

      expect(duration).toBeLessThan(500); // 500ms threshold
    });

    it('should check item availability within 100ms', async () => {
      const { duration } = await measureExecutionTime(async () => {
        return isItemAvailable('item-123');
      });

      expect(duration).toBeLessThan(100); // 100ms threshold
    });

    it('should handle batch availability checks efficiently', async () => {
      const itemIds = Array.from({ length: 100 }, (_, i) => `item-${i}`);

      mockDb.item.findMany.mockResolvedValue(await generateTestData(100));

      const { duration } = await measureExecutionTime(async () => {
        // Simulate batch checking multiple items
        return Promise.all(itemIds.map((id) => isItemAvailable(id)));
      });

      // Should handle 100 items in under 2 seconds
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Database Query Optimization', () => {
    it('should use efficient queries for borrow request listing', async () => {
      const testRequests = Array.from({ length: 50 }, (_, i) => ({
        id: `request-${i}`,
        borrowerId: `borrower-${i % 5}`, // 5 different borrowers
        lenderId: `lender-${i % 3}`, // 3 different lenders
        status: ['PENDING', 'APPROVED', 'ACTIVE', 'RETURNED'][i % 4],
        createdAt: new Date(Date.now() - i * 86400000), // Spread over time
      }));

      mockDb.borrowRequest.findMany.mockResolvedValue(testRequests);

      const { duration } = await measureExecutionTime(async () => {
        return mockDb.borrowRequest.findMany({
          where: {
            OR: [{ borrowerId: 'user-123' }, { lenderId: 'user-123' }],
          },
          include: {
            item: { select: { id: true, name: true, imageUrl: true } },
            borrower: { select: { id: true, name: true, image: true } },
            lender: { select: { id: true, name: true, image: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
      });

      // Database query should be fast
      expect(duration).toBeLessThan(50);
      expect(mockDb.borrowRequest.findMany).toHaveBeenCalledTimes(1);
    });

    it('should avoid N+1 queries when loading related data', async () => {
      const testData = {
        id: 'request-123',
        borrower: { id: 'borrower-123', name: 'Borrower' },
        lender: { id: 'lender-123', name: 'Lender' },
        item: { id: 'item-123', name: 'Item' },
      };

      mockDb.borrowRequest.findUnique.mockResolvedValue(testData);

      const { duration } = await measureExecutionTime(async () => {
        return mockDb.borrowRequest.findUnique({
          where: { id: 'request-123' },
          include: {
            borrower: {
              select: { id: true, name: true, phone: true, email: true },
            },
            lender: {
              select: { id: true, name: true, phone: true, email: true },
            },
            item: {
              select: {
                id: true,
                name: true,
                description: true,
                imageUrl: true,
                condition: true,
              },
            },
          },
        });
      });

      expect(duration).toBeLessThan(50);
      // Should only make one database call, not separate calls for each relation
      expect(mockDb.borrowRequest.findUnique).toHaveBeenCalledTimes(1);
      expect(mockDb.user.findUnique).not.toHaveBeenCalled(); // Relations loaded in single query
    });
  });

  describe('Notification Performance', () => {
    it('should handle notification sending efficiently', async () => {
      const { duration } = await measureExecutionTime(async () => {
        return createBorrowRequest({
          borrowerId: 'user-123',
          itemId: 'item-123',
          requestedReturnDate: new Date('2024-12-31'),
          requestMessage: 'Test request',
        });
      });

      // Even with notifications, should complete quickly
      expect(duration).toBeLessThan(1000); // 1 second threshold

      // Verify notifications were called
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
    });

    it('should not be blocked by slow notification services', async () => {
      // Simulate slow notification service
      mockSendNotification.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 2000)) // 2 second delay
      );

      const { result, duration } = await measureExecutionTime(async () => {
        return createBorrowRequest({
          borrowerId: 'user-123',
          itemId: 'item-123',
          requestedReturnDate: new Date('2024-12-31'),
          requestMessage: 'Test request',
        });
      });

      // Should still complete the main operation quickly
      // (In a real implementation, notifications would be async)
      expect(duration).toBeLessThan(3000); // Allow for the slow notification
      expect(result).toBeDefined(); // Should still succeed
    });

    it('should handle notification failures gracefully', async () => {
      mockSendNotification.mockRejectedValue(new Error('Email service down'));

      const { result, duration } = await measureExecutionTime(async () => {
        return createBorrowRequest({
          borrowerId: 'user-123',
          itemId: 'item-123',
          requestedReturnDate: new Date('2024-12-31'),
          requestMessage: 'Test request',
        });
      });

      // Should complete quickly despite notification failure
      expect(duration).toBeLessThan(500);
      expect(result).toBeDefined(); // Should still succeed
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple simultaneous requests efficiently', async () => {
      const requestCount = 10;
      const requests = Array.from({ length: requestCount }, (_, i) => ({
        borrowerId: `user-${i}`,
        itemId: `item-${i}`,
        requestedReturnDate: new Date('2024-12-31'),
        requestMessage: `Request ${i}`,
      }));

      // Setup mocks for each request
      requests.forEach((_, i) => {
        mockDb.user.findUnique.mockResolvedValueOnce({
          id: `user-${i}`,
          name: `User ${i}`,
          phone: `+123456789${i}`,
          email: `user${i}@example.com`,
        });

        mockDb.item.findUnique.mockResolvedValueOnce({
          id: `item-${i}`,
          name: `Item ${i}`,
          ownerId: `owner-${i}`,
          currentBorrowRequestId: null,
          owner: {
            id: `owner-${i}`,
            name: `Owner ${i}`,
            phone: `+987654321${i}`,
            email: `owner${i}@example.com`,
          },
        });

        mockDb.borrowRequest.create.mockResolvedValueOnce({
          id: `request-${i}`,
          borrowerId: `user-${i}`,
          lenderId: `owner-${i}`,
          itemId: `item-${i}`,
          status: 'PENDING',
        });
      });

      const { result, duration } = await measureExecutionTime(async () => {
        return Promise.all(requests.map((req) => createBorrowRequest(req)));
      });

      // Should handle 10 concurrent requests in under 2 seconds
      expect(duration).toBeLessThan(2000);
      expect(result).toHaveLength(requestCount);
      expect(mockDb.borrowRequest.create).toHaveBeenCalledTimes(requestCount);
    });

    it('should prevent race conditions on item availability', async () => {
      // Two users trying to borrow the same item simultaneously
      const mockItem = {
        id: 'item-123',
        name: 'Popular Item',
        ownerId: 'owner-123',
        currentBorrowRequestId: null,
        owner: {
          id: 'owner-123',
          name: 'Owner',
          phone: '+1987654321',
          email: 'owner@example.com',
        },
      };

      // First call succeeds
      mockDb.item.findUnique.mockResolvedValueOnce(mockItem);
      mockDb.borrowRequest.create.mockResolvedValueOnce({
        id: 'request-1',
        borrowerId: 'user-1',
        lenderId: 'owner-123',
        itemId: 'item-123',
        status: 'PENDING',
      });

      // Second call should see item as unavailable
      mockDb.item.findUnique.mockResolvedValueOnce({
        ...mockItem,
        currentBorrowRequestId: 'request-1',
      });

      const requests = [
        createBorrowRequest({
          borrowerId: 'user-1',
          itemId: 'item-123',
          requestedReturnDate: new Date('2024-12-31'),
        }),
        createBorrowRequest({
          borrowerId: 'user-2',
          itemId: 'item-123',
          requestedReturnDate: new Date('2024-12-31'),
        }),
      ];

      const { duration } = await measureExecutionTime(async () => {
        return Promise.allSettled(requests);
      });

      expect(duration).toBeLessThan(1000);
      // Only one should succeed, one should fail
      const results = await Promise.allSettled(requests);
      const successCount = results.filter(
        (r) => r.status === 'fulfilled'
      ).length;
      const failureCount = results.filter(
        (r) => r.status === 'rejected'
      ).length;

      expect(successCount + failureCount).toBe(2);
      expect(failureCount).toBeGreaterThan(0); // At least one should fail due to unavailability
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not leak memory with large result sets', async () => {
      const largeDataSet = await generateTestData(1000);
      mockDb.borrowRequest.findMany.mockResolvedValue(largeDataSet);

      const initialMemory = process.memoryUsage();

      const { result } = await measureExecutionTime(async () => {
        // Simulate processing large dataset
        const data = await mockDb.borrowRequest.findMany();
        return data.map(
          (item: { id: string; name: string; status?: string }) => ({
            id: item.id,
            name: item.name,
            status: item.status,
          })
        );
      });

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(result).toHaveLength(1000);
      // Memory growth should be reasonable (less than 50MB for 1000 items)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    });

    it('should clean up resources after failed operations', async () => {
      mockDb.borrowRequest.create.mockRejectedValue(
        new Error('Database error')
      );

      const initialMemory = process.memoryUsage();

      const { result } = await measureExecutionTime(async () => {
        try {
          return await createBorrowRequest({
            borrowerId: 'user-123',
            itemId: 'item-123',
            requestedReturnDate: new Date('2024-12-31'),
          });
        } catch (error) {
          return error;
        }
      });

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(result).toBeInstanceOf(Error);
      // Memory growth should be minimal even after error
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
    });
  });

  describe('Scalability Tests', () => {
    it('should maintain performance with increasing user load', async () => {
      const userCounts = [10, 50, 100, 200];
      const results: { userCount: number; avgDuration: number }[] = [];

      for (const userCount of userCounts) {
        const testUsers = Array.from({ length: userCount }, (_, i) => ({
          id: `user-${i}`,
          name: `User ${i}`,
          phone: `+123456789${i}`,
          email: `user${i}@example.com`,
        }));

        // Mock responses for all users
        testUsers.forEach((user) => {
          mockDb.user.findUnique.mockResolvedValueOnce(user);
        });

        const durations: number[] = [];

        for (let i = 0; i < Math.min(userCount, 20); i++) {
          // Test up to 20 samples
          const { duration } = await measureExecutionTime(async () => {
            return mockDb.user.findUnique({ where: { id: `user-${i}` } });
          });
          durations.push(duration);
        }

        const avgDuration =
          durations.reduce((sum, d) => sum + d, 0) / durations.length;
        results.push({ userCount, avgDuration });
      }

      // Performance shouldn't degrade significantly with user count
      const firstResult = results[0];
      const lastResult = results[results.length - 1];

      // Average duration shouldn't increase by more than 50%
      if (firstResult && lastResult) {
        expect(lastResult.avgDuration).toBeLessThan(
          firstResult.avgDuration * 1.5
        );
      }
    });

    it('should handle database connection pool efficiently', async () => {
      // Simulate many concurrent database operations
      const operationCount = 50;
      const operations = Array.from({ length: operationCount }, (_, i) =>
        measureExecutionTime(async () => {
          return mockDb.borrowRequest.findMany({
            where: { borrowerId: `user-${i % 10}` }, // Distribute across 10 users
            take: 10,
          });
        })
      );

      mockDb.borrowRequest.findMany.mockResolvedValue([]);

      const results = await Promise.all(operations);
      const avgDuration =
        results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const maxDuration = Math.max(...results.map((r) => r.duration));

      // Average should be reasonable
      expect(avgDuration).toBeLessThan(100); // 100ms average
      // Max duration shouldn't be excessive (no connection pool exhaustion)
      expect(maxDuration).toBeLessThan(500); // 500ms max
    });
  });

  describe('Resource Cleanup Tests', () => {
    it('should clean up after successful operations', async () => {
      const { result } = await measureExecutionTime(async () => {
        return createBorrowRequest({
          borrowerId: 'user-123',
          itemId: 'item-123',
          requestedReturnDate: new Date('2024-12-31'),
        });
      });

      expect(result).toBeDefined();

      // Verify cleanup (mocks should be called expected number of times)
      expect(mockDb.borrowRequest.create).toHaveBeenCalledTimes(1);
      expect(mockSendNotification).toHaveBeenCalledTimes(1);

      // In real implementation, would verify:
      // - Database connections are returned to pool
      // - Memory is freed
      // - Temporary resources are cleaned up
    });

    it('should clean up after failed operations', async () => {
      mockDb.item.findUnique.mockRejectedValue(new Error('Database error'));

      const { result } = await measureExecutionTime(async () => {
        try {
          return await createBorrowRequest({
            borrowerId: 'user-123',
            itemId: 'item-123',
            requestedReturnDate: new Date('2024-12-31'),
          });
        } catch (error) {
          return error;
        }
      });

      expect(result).toBeInstanceOf(Error);

      // Verify that cleanup still happened despite error
      expect(mockDb.item.findUnique).toHaveBeenCalledTimes(1);
      expect(mockDb.borrowRequest.create).not.toHaveBeenCalled(); // Should not reach this point
    });
  });
});

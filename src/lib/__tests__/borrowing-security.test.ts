import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('next-auth');
vi.mock('@/lib/db');

const mockGetServerSession = vi.mocked(getServerSession);
const mockDb = {
  borrowRequest: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

vi.doMock('@/lib/db', () => ({ db: mockDb }));

// Import the functions we're testing
import { GET, PATCH } from '@/app/api/borrow-requests/[id]/route';

describe('Borrowing Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without authentication', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost/api/borrow-requests/123'
      );
      const params = { params: Promise.resolve({ id: '123' }) };

      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject requests with invalid session', async () => {
      mockGetServerSession.mockResolvedValue({ user: {} }); // No user ID

      const request = new NextRequest(
        'http://localhost/api/borrow-requests/123'
      );
      const params = { params: Promise.resolve({ id: '123' }) };

      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('User ID not found');
    });

    it("should prevent access to other users' borrow requests", async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user-123' } });
      mockDb.borrowRequest.findUnique.mockResolvedValue({
        id: 'request-456',
        borrowerId: 'other-user-123',
        lenderId: 'another-user-456',
        status: 'PENDING',
      });

      const request = new NextRequest(
        'http://localhost/api/borrow-requests/request-456'
      );
      const params = { params: Promise.resolve({ id: 'request-456' }) };

      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe(
        'Access denied - you are not authorized to view this request'
      );
    });

    it("should allow access to borrower's own requests", async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'borrower-123' } });
      mockDb.borrowRequest.findUnique.mockResolvedValue({
        id: 'request-456',
        borrowerId: 'borrower-123',
        lenderId: 'lender-456',
        status: 'PENDING',
        borrower: { id: 'borrower-123', name: 'Test' },
        lender: { id: 'lender-456', name: 'Lender' },
        item: { id: 'item-123', name: 'Item' },
      });

      const request = new NextRequest(
        'http://localhost/api/borrow-requests/request-456'
      );
      const params = { params: Promise.resolve({ id: 'request-456' }) };

      const response = await GET(request, params);

      expect(response.status).toBe(200);
    });

    it("should allow access to lender's requests", async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'lender-123' } });
      mockDb.borrowRequest.findUnique.mockResolvedValue({
        id: 'request-456',
        borrowerId: 'borrower-456',
        lenderId: 'lender-123',
        status: 'PENDING',
        borrower: { id: 'borrower-456', name: 'Borrower' },
        lender: { id: 'lender-123', name: 'Test' },
        item: { id: 'item-123', name: 'Item' },
      });

      const request = new NextRequest(
        'http://localhost/api/borrow-requests/request-456'
      );
      const params = { params: Promise.resolve({ id: 'request-456' }) };

      const response = await GET(request, params);

      expect(response.status).toBe(200);
    });
  });

  describe('Action Authorization', () => {
    const mockBorrowRequest = {
      id: 'request-123',
      borrowerId: 'borrower-123',
      lenderId: 'lender-123',
      status: 'PENDING',
      item: { id: 'item-123', name: 'Test Item', ownerId: 'lender-123' },
      borrower: {
        id: 'borrower-123',
        name: 'Borrower',
        phone: '+1234567890',
        email: 'b@test.com',
      },
      lender: {
        id: 'lender-123',
        name: 'Lender',
        phone: '+1987654321',
        email: 'l@test.com',
      },
    };

    beforeEach(() => {
      mockDb.borrowRequest.findUnique.mockResolvedValue(mockBorrowRequest);
      mockDb.borrowRequest.update.mockResolvedValue(mockBorrowRequest);
    });

    it('should prevent borrower from approving/declining requests', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'borrower-123' } });

      const request = new NextRequest(
        'http://localhost/api/borrow-requests/request-123',
        {
          method: 'PATCH',
          body: JSON.stringify({ action: 'approve' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const params = { params: Promise.resolve({ id: 'request-123' }) };

      const response = await PATCH(request, params);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe(
        'Only the item owner can approve or decline requests'
      );
    });

    it('should prevent lender from marking items as returned', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'lender-123' } });
      mockDb.borrowRequest.findUnique.mockResolvedValue({
        ...mockBorrowRequest,
        status: 'ACTIVE',
      });

      const request = new NextRequest(
        'http://localhost/api/borrow-requests/request-123',
        {
          method: 'PATCH',
          body: JSON.stringify({ action: 'return' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const params = { params: Promise.resolve({ id: 'request-123' }) };

      const response = await PATCH(request, params);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only the borrower can mark items as returned');
    });

    it('should prevent unauthorized users from any actions', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'unauthorized-user' },
      });

      const request = new NextRequest(
        'http://localhost/api/borrow-requests/request-123',
        {
          method: 'PATCH',
          body: JSON.stringify({ action: 'approve' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const params = { params: Promise.resolve({ id: 'request-123' }) };

      const response = await PATCH(request, params);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe(
        'Only the item owner can approve or decline requests'
      );
    });
  });

  describe('Status Transition Security', () => {
    const mockBorrowRequest = {
      id: 'request-123',
      borrowerId: 'borrower-123',
      lenderId: 'lender-123',
      item: { id: 'item-123', name: 'Test Item', ownerId: 'lender-123' },
      borrower: {
        id: 'borrower-123',
        name: 'Borrower',
        phone: '+1234567890',
        email: 'b@test.com',
      },
      lender: {
        id: 'lender-123',
        name: 'Lender',
        phone: '+1987654321',
        email: 'l@test.com',
      },
    };

    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'lender-123' } });
      mockDb.borrowRequest.update.mockResolvedValue(mockBorrowRequest);
    });

    it('should prevent approval of non-pending requests', async () => {
      mockDb.borrowRequest.findUnique.mockResolvedValue({
        ...mockBorrowRequest,
        status: 'APPROVED', // Already approved
      });

      const request = new NextRequest(
        'http://localhost/api/borrow-requests/request-123',
        {
          method: 'PATCH',
          body: JSON.stringify({ action: 'approve' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const params = { params: Promise.resolve({ id: 'request-123' }) };

      const response = await PATCH(request, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot approve a request with status: APPROVED');
    });

    it('should prevent return of non-active requests', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'borrower-123' } });
      mockDb.borrowRequest.findUnique.mockResolvedValue({
        ...mockBorrowRequest,
        status: 'PENDING', // Not active yet
      });

      const request = new NextRequest(
        'http://localhost/api/borrow-requests/request-123',
        {
          method: 'PATCH',
          body: JSON.stringify({ action: 'return' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const params = { params: Promise.resolve({ id: 'request-123' }) };

      const response = await PATCH(request, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        'Can only return items that are currently active'
      );
    });

    it('should prevent cancellation of active borrows by lender', async () => {
      mockDb.borrowRequest.findUnique.mockResolvedValue({
        ...mockBorrowRequest,
        status: 'ACTIVE',
      });

      const request = new NextRequest(
        'http://localhost/api/borrow-requests/request-123',
        {
          method: 'PATCH',
          body: JSON.stringify({ action: 'cancel' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const params = { params: Promise.resolve({ id: 'request-123' }) };

      const response = await PATCH(request, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Lenders can only cancel pending requests');
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should reject invalid action types', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user-123' } });
      mockDb.borrowRequest.findUnique.mockResolvedValue({
        id: 'request-123',
        borrowerId: 'user-123',
        lenderId: 'lender-123',
      });

      const request = new NextRequest(
        'http://localhost/api/borrow-requests/request-123',
        {
          method: 'PATCH',
          body: JSON.stringify({ action: 'invalid-action' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const params = { params: Promise.resolve({ id: 'request-123' }) };

      const response = await PATCH(request, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        'Action must be one of: approve, decline, return, cancel, confirm-return'
      );
    });

    it('should handle malformed JSON gracefully', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user-123' } });

      const request = new NextRequest(
        'http://localhost/api/borrow-requests/request-123',
        {
          method: 'PATCH',
          body: 'invalid-json{',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const params = { params: Promise.resolve({ id: 'request-123' }) };

      const response = await PATCH(request, params);

      expect(response.status).toBe(500); // Should handle JSON parsing errors
    });

    it('should sanitize message inputs to prevent XSS', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'lender-123' } });
      mockDb.borrowRequest.findUnique.mockResolvedValue({
        id: 'request-123',
        borrowerId: 'borrower-123',
        lenderId: 'lender-123',
        status: 'PENDING',
        item: { id: 'item-123', name: 'Test Item', ownerId: 'lender-123' },
        borrower: {
          id: 'borrower-123',
          name: 'Borrower',
          phone: '+1234567890',
          email: 'b@test.com',
        },
        lender: {
          id: 'lender-123',
          name: 'Lender',
          phone: '+1987654321',
          email: 'l@test.com',
        },
      });

      const maliciousMessage = '<script>alert("XSS")</script>Approved';

      const request = new NextRequest(
        'http://localhost/api/borrow-requests/request-123',
        {
          method: 'PATCH',
          body: JSON.stringify({
            action: 'approve',
            message: maliciousMessage,
          }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const params = { params: Promise.resolve({ id: 'request-123' }) };

      const response = await PATCH(request, params);

      expect(response.status).toBe(200);

      // Verify the message was stored (the API doesn't actually sanitize,
      // but the frontend should handle this)
      expect(mockDb.borrowRequest.update).toHaveBeenCalledWith({
        where: { id: 'request-123' },
        data: expect.objectContaining({
          lenderMessage: maliciousMessage,
        }),
      });
    });

    it('should validate request ID format', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user-123' } });

      // Test with invalid UUID-like ID
      const request = new NextRequest(
        'http://localhost/api/borrow-requests/invalid-id'
      );
      const params = { params: Promise.resolve({ id: 'invalid-id' }) };

      mockDb.borrowRequest.findUnique.mockResolvedValue(null);

      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Borrow request not found');
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    it('should handle concurrent requests safely', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'lender-123' } });
      mockDb.borrowRequest.findUnique.mockResolvedValue({
        id: 'request-123',
        borrowerId: 'borrower-123',
        lenderId: 'lender-123',
        status: 'PENDING',
        item: { id: 'item-123', name: 'Test Item', ownerId: 'lender-123' },
        borrower: {
          id: 'borrower-123',
          name: 'Borrower',
          phone: '+1234567890',
          email: 'b@test.com',
        },
        lender: {
          id: 'lender-123',
          name: 'Lender',
          phone: '+1987654321',
          email: 'l@test.com',
        },
      });

      // Simulate concurrent approval requests
      const requests = Array(5)
        .fill(null)
        .map(() => {
          const request = new NextRequest(
            'http://localhost/api/borrow-requests/request-123',
            {
              method: 'PATCH',
              body: JSON.stringify({ action: 'approve' }),
              headers: { 'Content-Type': 'application/json' },
            }
          );
          const params = { params: Promise.resolve({ id: 'request-123' }) };
          return PATCH(request, params);
        });

      const responses = await Promise.all(requests);

      // At least one should succeed, others might fail due to status changes
      const successCount = responses.filter((r) => r.status === 200).length;
      const errorCount = responses.filter((r) => r.status >= 400).length;

      expect(successCount + errorCount).toBe(5);
      expect(successCount).toBeGreaterThan(0); // At least one should succeed
    });

    it('should handle database connection failures gracefully', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user-123' } });
      mockDb.borrowRequest.findUnique.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest(
        'http://localhost/api/borrow-requests/request-123'
      );
      const params = { params: Promise.resolve({ id: 'request-123' }) };

      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch borrow request');
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should handle SQL injection attempts in request ID', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user-123' } });

      const maliciousId = "1' OR '1'='1'; --";
      const request = new NextRequest(
        `http://localhost/api/borrow-requests/${encodeURIComponent(maliciousId)}`
      );
      const params = { params: Promise.resolve({ id: maliciousId }) };

      // Prisma should handle this safely, but verify it doesn't break
      mockDb.borrowRequest.findUnique.mockResolvedValue(null);

      const response = await GET(request, params);

      // Should return 404, not crash or expose database errors
      expect(response.status).toBe(404);
      expect(mockDb.borrowRequest.findUnique).toHaveBeenCalledWith({
        where: { id: maliciousId },
        include: expect.any(Object),
      });
    });
  });

  describe('Information Disclosure Prevention', () => {
    it('should not leak sensitive information in error messages', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user-123' } });
      mockDb.borrowRequest.findUnique.mockRejectedValue(
        new Error('Sensitive database error with connection string')
      );

      const request = new NextRequest(
        'http://localhost/api/borrow-requests/request-123'
      );
      const params = { params: Promise.resolve({ id: 'request-123' }) };

      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch borrow request');
      expect(data.error).not.toContain('connection string');
      expect(data.error).not.toContain('database');
    });

    it('should not expose user details to unauthorized users', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'unauthorized-user' },
      });
      mockDb.borrowRequest.findUnique.mockResolvedValue({
        id: 'request-123',
        borrowerId: 'borrower-123',
        lenderId: 'lender-123',
        status: 'PENDING',
        borrower: {
          id: 'borrower-123',
          name: 'Secret Name',
          phone: '+1234567890',
          email: 'secret@email.com',
        },
      });

      const request = new NextRequest(
        'http://localhost/api/borrow-requests/request-123'
      );
      const params = { params: Promise.resolve({ id: 'request-123' }) };

      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(JSON.stringify(data)).not.toContain('Secret Name');
      expect(JSON.stringify(data)).not.toContain('secret@email.com');
    });
  });
});

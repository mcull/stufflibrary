import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { GET, PATCH } from '../route';

// Mock dependencies
vi.mock('next-auth');
vi.mock('@/lib/db');
vi.mock('@/lib/audit-log');
vi.mock('@/lib/borrow-request-utils');
vi.mock('@/lib/twilio');

const mockGetServerSession = vi.mocked(getServerSession);

const mockDb = {
  borrowRequest: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

const mockLogBorrowRequestStatusChange = vi.fn();
const mockUpdateItemAvailability = vi.fn();
const mockSendBorrowResponseNotification = vi.fn();
const mockSendReturnNotification = vi.fn();
const mockSendCancellationNotification = vi.fn();

vi.doMock('@/lib/db', () => ({ db: mockDb }));
vi.doMock('@/lib/audit-log', () => ({
  logBorrowRequestStatusChange: mockLogBorrowRequestStatusChange,
}));
vi.doMock('@/lib/borrow-request-utils', () => ({
  updateItemAvailability: mockUpdateItemAvailability,
}));
vi.doMock('@/lib/twilio', () => ({
  sendBorrowResponseNotification: mockSendBorrowResponseNotification,
  sendReturnNotification: mockSendReturnNotification,
  sendCancellationNotification: mockSendCancellationNotification,
}));

// Test data
const mockSession = { user: { id: 'user-123' } };

const mockBorrowRequest = {
  id: 'request-123',
  borrowerId: 'borrower-123',
  lenderId: 'lender-123',
  itemId: 'item-123',
  status: 'PENDING',
  requestMessage: 'Can I borrow this?',
  lenderMessage: null,
  createdAt: new Date(),
  borrower: {
    id: 'borrower-123',
    name: 'John Borrower',
    image: null,
    phone: '+1234567890',
    email: 'borrower@example.com',
  },
  lender: {
    id: 'lender-123',
    name: 'Jane Lender',
    image: null,
    phone: '+1987654321',
    email: 'lender@example.com',
  },
  item: {
    id: 'item-123',
    name: 'Test Item',
    description: 'A test item',
    imageUrl: 'https://example.com/image.jpg',
    condition: 'good',
    ownerId: 'lender-123',
  },
};

describe('/api/borrow-requests/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET', () => {
    const createRequest = (id: string) => 
      new NextRequest(`http://localhost/api/borrow-requests/${id}`);

    const createRouteParams = (id: string) => ({
      params: Promise.resolve({ id }),
    });

    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const response = await GET(createRequest('123'), createRouteParams('123'));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 if user ID is not found', async () => {
      mockGetServerSession.mockResolvedValue({ user: {} });

      const response = await GET(createRequest('123'), createRouteParams('123'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('User ID not found');
    });

    it('should return 404 if borrow request is not found', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockDb.borrowRequest.findUnique.mockResolvedValue(null);

      const response = await GET(createRequest('nonexistent'), createRouteParams('nonexistent'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Borrow request not found');
    });

    it('should return 403 if user is not authorized to view request', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'unauthorized-user' } });
      mockDb.borrowRequest.findUnique.mockResolvedValue(mockBorrowRequest);

      const response = await GET(createRequest('123'), createRouteParams('123'));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied - you are not authorized to view this request');
    });

    it('should return borrow request if user is borrower', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'borrower-123' } });
      mockDb.borrowRequest.findUnique.mockResolvedValue(mockBorrowRequest);

      const response = await GET(createRequest('123'), createRouteParams('123'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.borrowRequest).toEqual(mockBorrowRequest);
    });

    it('should return borrow request if user is lender', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'lender-123' } });
      mockDb.borrowRequest.findUnique.mockResolvedValue(mockBorrowRequest);

      const response = await GET(createRequest('123'), createRouteParams('123'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.borrowRequest).toEqual(mockBorrowRequest);
    });

    it('should handle database errors', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockDb.borrowRequest.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await GET(createRequest('123'), createRouteParams('123'));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch borrow request');
    });
  });

  describe('PATCH', () => {
    const createRequest = (id: string, body: Record<string, unknown>) =>
      new NextRequest(`http://localhost/api/borrow-requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });

    const createRouteParams = (id: string) => ({
      params: Promise.resolve({ id }),
    });

    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockDb.borrowRequest.findUnique.mockResolvedValue(mockBorrowRequest);
      mockDb.borrowRequest.update.mockResolvedValue({ ...mockBorrowRequest, status: 'APPROVED' });
      mockLogBorrowRequestStatusChange.mockResolvedValue(undefined);
      mockUpdateItemAvailability.mockResolvedValue(undefined);
      mockSendBorrowResponseNotification.mockResolvedValue(undefined);
    });

    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const response = await PATCH(
        createRequest('123', { action: 'approve' }),
        createRouteParams('123')
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid action', async () => {
      const response = await PATCH(
        createRequest('123', { action: 'invalid-action' }),
        createRouteParams('123')
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Action must be one of: approve, decline, return, cancel, confirm-return');
    });

    it('should return 404 if borrow request is not found', async () => {
      mockDb.borrowRequest.findUnique.mockResolvedValue(null);

      const response = await PATCH(
        createRequest('123', { action: 'approve' }),
        createRouteParams('123')
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Borrow request not found');
    });

    describe('approve/decline actions', () => {
      it('should approve request when user is lender', async () => {
        mockGetServerSession.mockResolvedValue({ user: { id: 'lender-123' } });

        const response = await PATCH(
          createRequest('123', { action: 'approve', message: 'Approved!' }),
          createRouteParams('123')
        );
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBe('Borrow request approved successfully');

        expect(mockDb.borrowRequest.update).toHaveBeenCalledWith({
          where: { id: 'request-123' },
          data: {
            status: 'APPROVED',
            lenderMessage: 'Approved!',
            approvedAt: expect.any(Date),
            declinedAt: null,
          },
        });
      });

      it('should decline request when user is lender', async () => {
        mockGetServerSession.mockResolvedValue({ user: { id: 'lender-123' } });

        const response = await PATCH(
          createRequest('123', { action: 'decline', message: 'Not available' }),
          createRouteParams('123')
        );

        expect(response.status).toBe(200);
        expect(mockDb.borrowRequest.update).toHaveBeenCalledWith({
          where: { id: 'request-123' },
          data: {
            status: 'DECLINED',
            lenderMessage: 'Not available',
            approvedAt: null,
            declinedAt: expect.any(Date),
          },
        });
      });

      it('should return 403 if borrower tries to approve/decline', async () => {
        mockGetServerSession.mockResolvedValue({ user: { id: 'borrower-123' } });

        const response = await PATCH(
          createRequest('123', { action: 'approve' }),
          createRouteParams('123')
        );
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Only the item owner can approve or decline requests');
      });

      it('should return 400 if request is not pending', async () => {
        mockGetServerSession.mockResolvedValue({ user: { id: 'lender-123' } });
        mockDb.borrowRequest.findUnique.mockResolvedValue({
          ...mockBorrowRequest,
          status: 'APPROVED',
        });

        const response = await PATCH(
          createRequest('123', { action: 'approve' }),
          createRouteParams('123')
        );
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Cannot approve a request with status: APPROVED');
      });
    });

    describe('return action', () => {
      beforeEach(() => {
        mockDb.borrowRequest.findUnique.mockResolvedValue({
          ...mockBorrowRequest,
          status: 'ACTIVE',
        });
      });

      it('should mark item as returned when user is borrower', async () => {
        mockGetServerSession.mockResolvedValue({ user: { id: 'borrower-123' } });

        const response = await PATCH(
          createRequest('123', { 
            action: 'return', 
            message: 'Returned in good condition',
            actualReturnDate: '2024-01-15T10:00:00Z'
          }),
          createRouteParams('123')
        );
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBe('Borrow request returned successfully');

        expect(mockDb.borrowRequest.update).toHaveBeenCalledWith({
          where: { id: 'request-123' },
          data: {
            status: 'RETURNED',
            returnedAt: new Date('2024-01-15T10:00:00Z'),
            borrowerNotes: 'Returned in good condition',
          },
        });
      });

      it('should return 403 if lender tries to mark as returned', async () => {
        mockGetServerSession.mockResolvedValue({ user: { id: 'lender-123' } });

        const response = await PATCH(
          createRequest('123', { action: 'return' }),
          createRouteParams('123')
        );
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Only the borrower can mark items as returned');
      });

      it('should return 400 if request is not active', async () => {
        mockGetServerSession.mockResolvedValue({ user: { id: 'borrower-123' } });
        mockDb.borrowRequest.findUnique.mockResolvedValue({
          ...mockBorrowRequest,
          status: 'PENDING',
        });

        const response = await PATCH(
          createRequest('123', { action: 'return' }),
          createRouteParams('123')
        );
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Can only return items that are currently active');
      });
    });

    describe('cancel action', () => {
      it('should allow borrower to cancel pending request', async () => {
        mockGetServerSession.mockResolvedValue({ user: { id: 'borrower-123' } });

        const response = await PATCH(
          createRequest('123', { action: 'cancel', message: 'No longer needed' }),
          createRouteParams('123')
        );
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBe('Borrow request cancelled successfully');

        expect(mockDb.borrowRequest.update).toHaveBeenCalledWith({
          where: { id: 'request-123' },
          data: {
            status: 'CANCELLED',
            cancelledAt: expect.any(Date),
            cancellationReason: 'No longer needed',
            cancelledBy: 'borrower-123',
          },
        });
      });

      it('should allow borrower to cancel approved request', async () => {
        mockGetServerSession.mockResolvedValue({ user: { id: 'borrower-123' } });
        mockDb.borrowRequest.findUnique.mockResolvedValue({
          ...mockBorrowRequest,
          status: 'APPROVED',
        });

        const response = await PATCH(
          createRequest('123', { action: 'cancel' }),
          createRouteParams('123')
        );

        expect(response.status).toBe(200);
      });

      it('should allow lender to cancel pending request', async () => {
        mockGetServerSession.mockResolvedValue({ user: { id: 'lender-123' } });

        const response = await PATCH(
          createRequest('123', { action: 'cancel' }),
          createRouteParams('123')
        );

        expect(response.status).toBe(200);
      });

      it('should not allow lender to cancel approved request', async () => {
        mockGetServerSession.mockResolvedValue({ user: { id: 'lender-123' } });
        mockDb.borrowRequest.findUnique.mockResolvedValue({
          ...mockBorrowRequest,
          status: 'APPROVED',
        });

        const response = await PATCH(
          createRequest('123', { action: 'cancel' }),
          createRouteParams('123')
        );
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Lenders can only cancel pending requests');
      });
    });

    describe('confirm-return action', () => {
      beforeEach(() => {
        mockDb.borrowRequest.findUnique.mockResolvedValue({
          ...mockBorrowRequest,
          status: 'RETURNED',
        });
      });

      it('should allow lender to confirm return', async () => {
        mockGetServerSession.mockResolvedValue({ user: { id: 'lender-123' } });

        const response = await PATCH(
          createRequest('123', { action: 'confirm-return', message: 'Item received in good condition' }),
          createRouteParams('123')
        );
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);

        expect(mockDb.borrowRequest.update).toHaveBeenCalledWith({
          where: { id: 'request-123' },
          data: {
            status: 'RETURNED',
            lenderMessage: 'Item received in good condition',
            updatedAt: expect.any(Date),
          },
        });
      });

      it('should return 403 if borrower tries to confirm return', async () => {
        mockGetServerSession.mockResolvedValue({ user: { id: 'borrower-123' } });

        const response = await PATCH(
          createRequest('123', { action: 'confirm-return' }),
          createRouteParams('123')
        );
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Only the item owner can confirm returns');
      });

      it('should return 400 if request is not returned', async () => {
        mockGetServerSession.mockResolvedValue({ user: { id: 'lender-123' } });
        mockDb.borrowRequest.findUnique.mockResolvedValue({
          ...mockBorrowRequest,
          status: 'ACTIVE',
        });

        const response = await PATCH(
          createRequest('123', { action: 'confirm-return' }),
          createRouteParams('123')
        );
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Can only confirm items that have been marked as returned');
      });
    });

    it('should call audit logging and item availability updates', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'lender-123' } });

      await PATCH(
        createRequest('123', { action: 'approve', message: 'Approved!' }),
        createRouteParams('123')
      );

      expect(mockLogBorrowRequestStatusChange).toHaveBeenCalledWith(
        'request-123',
        'lender-123',
        'PENDING',
        'APPROVED',
        {
          action: 'approve',
          message: 'Approved!',
          itemId: 'item-123',
          itemName: 'Test Item',
        }
      );

      expect(mockUpdateItemAvailability).toHaveBeenCalledWith(
        'item-123',
        'request-123',
        'APPROVED',
        'lender-123'
      );
    });

    it('should send notifications and continue on failure', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'lender-123' } });
      mockSendBorrowResponseNotification.mockRejectedValue(new Error('Notification failed'));

      const response = await PATCH(
        createRequest('123', { action: 'approve' }),
        createRouteParams('123')
      );

      expect(response.status).toBe(200); // Should still succeed
    });

    it('should handle database update errors', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'lender-123' } });
      mockDb.borrowRequest.update.mockRejectedValue(new Error('Database error'));

      const response = await PATCH(
        createRequest('123', { action: 'approve' }),
        createRouteParams('123')
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update borrow request');
    });
  });
});
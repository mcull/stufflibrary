import { NextRequest } from 'next/server';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock all external dependencies first
const mockGetServerSession = vi.fn();
const mockDb = {
  borrowRequest: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  item: {
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};
const mockSendBorrowRequestReceivedNotification = vi.fn();
const mockSendBorrowRequestNotification = vi.fn();

// Set up mocks before imports
vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock('@/lib/db', () => ({
  db: mockDb,
}));

vi.mock('@/lib/enhanced-notification-service', () => ({
  sendBorrowRequestReceivedNotification: mockSendBorrowRequestReceivedNotification,
}));

vi.mock('@/lib/twilio', () => ({
  sendBorrowRequestNotification: mockSendBorrowRequestNotification,
}));

vi.mock('uuid', () => ({ 
  v4: () => 'mock-uuid-1234' 
}));

// Import the functions we're testing after mocks are set up
const { GET, POST } = await import('../route');

// Test data
const mockUser = {
  id: 'user-123',
  name: 'John Doe',
  phone: '+1234567890',
  email: 'john@example.com',
};

const mockSession = {
  user: { id: 'user-123' },
};

const mockItem = {
  id: 'item-123',
  name: 'Test Item',
  ownerId: 'owner-123',
  currentBorrowRequestId: null,
  imageUrl: 'https://example.com/image.jpg',
  owner: {
    id: 'owner-123',
    name: 'Item Owner',
    phone: '+1987654321',
    email: 'owner@example.com',
  },
};

const mockBorrowRequest = {
  id: 'request-123',
  borrowerId: 'user-123',
  lenderId: 'owner-123',
  itemId: 'item-123',
  status: 'PENDING',
  requestMessage: 'Can I borrow this?',
  createdAt: new Date(),
  borrower: {
    id: 'user-123',
    name: 'John Doe',
    image: null,
  },
  item: {
    id: 'item-123',
    name: 'Test Item',
    imageUrl: 'https://example.com/image.jpg',
  },
};

describe('/api/borrow-requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/borrow-requests');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 if user ID is not found', async () => {
      mockGetServerSession.mockResolvedValue({ user: {} });

      const request = new NextRequest('http://localhost/api/borrow-requests');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('User ID not found');
    });

    it('should fetch borrow requests successfully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockDb.borrowRequest.findMany.mockResolvedValue([
        { ...mockBorrowRequest, borrowerId: 'user-123' },
        { ...mockBorrowRequest, id: 'request-456', lenderId: 'user-123', status: 'ACTIVE' },
      ]);

      const request = new NextRequest('http://localhost/api/borrow-requests');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sentRequests).toHaveLength(1);
      expect(data.receivedRequests).toHaveLength(1);
      expect(data.activeBorrows).toHaveLength(1);
      expect(data.all).toHaveLength(2);
    });

    it('should handle database errors', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockDb.borrowRequest.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/borrow-requests');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch borrow requests');
    });
  });

  describe('POST', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockDb.user.findUnique.mockResolvedValue(mockUser);
      mockDb.item.findUnique.mockResolvedValue(mockItem);
      mockDb.borrowRequest.create.mockResolvedValue(mockBorrowRequest);
      mockSendBorrowRequestReceivedNotification.mockResolvedValue(undefined);
      mockSendBorrowRequestNotification.mockResolvedValue({ 
        success: true,
        sms: { success: true },
        email: { success: true }
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/borrow-requests', {
        method: 'POST',
        body: JSON.stringify({ 
          itemId: 'item-123',
          requestedReturnDate: '2024-12-31T00:00:00Z',
          requestMessage: 'Test message'
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost/api/borrow-requests', {
        method: 'POST',
        body: JSON.stringify({ itemId: 'item-123' }), // Missing requestedReturnDate
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Item ID and requested return date are required');
    });

    it('should return 404 if item is not found', async () => {
      mockDb.item.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/borrow-requests', {
        method: 'POST',
        body: JSON.stringify({ 
          itemId: 'nonexistent-item',
          requestedReturnDate: '2024-12-31T00:00:00Z'
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Item not found');
    });

    it('should return 400 if user tries to borrow their own item', async () => {
      mockDb.item.findUnique.mockResolvedValue({
        ...mockItem,
        ownerId: 'user-123', // Same as requesting user
      });

      const request = new NextRequest('http://localhost/api/borrow-requests', {
        method: 'POST',
        body: JSON.stringify({ 
          itemId: 'item-123',
          requestedReturnDate: '2024-12-31T00:00:00Z'
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('You cannot borrow your own item');
    });

    it('should return 400 if item is not available', async () => {
      mockDb.item.findUnique.mockResolvedValue({
        ...mockItem,
        currentBorrowRequestId: 'existing-request-123',
      });

      const request = new NextRequest('http://localhost/api/borrow-requests', {
        method: 'POST',
        body: JSON.stringify({ 
          itemId: 'item-123',
          requestedReturnDate: '2024-12-31T00:00:00Z'
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Item is not available for borrowing');
    });

    it('should return 400 if borrower has no phone number', async () => {
      mockDb.user.findUnique.mockResolvedValue({
        ...mockUser,
        phone: null,
      });

      const request = new NextRequest('http://localhost/api/borrow-requests', {
        method: 'POST',
        body: JSON.stringify({ 
          itemId: 'item-123',
          requestedReturnDate: '2024-12-31T00:00:00Z'
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Borrower phone number required for notifications');
    });

    it('should create borrow request successfully with JSON body', async () => {
      const request = new NextRequest('http://localhost/api/borrow-requests', {
        method: 'POST',
        body: JSON.stringify({ 
          itemId: 'item-123',
          requestedReturnDate: '2024-12-31T00:00:00Z',
          requestMessage: 'Can I borrow this item?'
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.borrowRequestId).toBe('request-123');
      expect(data.message).toBe('Borrow request sent successfully');

      expect(mockDb.borrowRequest.create).toHaveBeenCalledWith({
        data: {
          borrowerId: 'user-123',
          lenderId: 'owner-123',
          itemId: 'item-123',
          requestMessage: 'Can I borrow this item?',
          videoUrl: null,
          requestedReturnDate: new Date('2024-12-31T00:00:00Z'),
          status: 'PENDING',
        },
        include: {
          borrower: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          item: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
        },
      });
    });

    it('should create borrow request successfully with FormData (Mux flow)', async () => {
      const formData = new FormData();
      formData.append('itemId', 'item-123');
      formData.append('promisedReturnBy', '2024-12-31T00:00:00Z');
      formData.append('promiseText', 'Promise to return safely');

      const request = new NextRequest('http://localhost/api/borrow-requests', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.borrowRequestId).toBe('request-123');

      expect(mockDb.borrowRequest.create).toHaveBeenCalledWith({
        data: {
          borrowerId: 'user-123',
          lenderId: 'owner-123',
          itemId: 'item-123',
          requestMessage: 'Promise to return safely',
          videoUrl: null,
          requestedReturnDate: new Date('2024-12-31T00:00:00Z'),
          status: 'PENDING',
        },
        include: {
          borrower: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          item: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
        },
      });
    });

    it('should send notifications and continue on notification failures', async () => {
      mockSendBorrowRequestReceivedNotification.mockRejectedValue(new Error('Notification failed'));
      mockSendBorrowRequestNotification.mockRejectedValue(new Error('SMS failed'));

      const request = new NextRequest('http://localhost/api/borrow-requests', {
        method: 'POST',
        body: JSON.stringify({ 
          itemId: 'item-123',
          requestedReturnDate: '2024-12-31T00:00:00Z'
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      // Should still succeed despite notification failures
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle database creation errors', async () => {
      mockDb.borrowRequest.create.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/borrow-requests', {
        method: 'POST',
        body: JSON.stringify({ 
          itemId: 'item-123',
          requestedReturnDate: '2024-12-31T00:00:00Z'
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create borrow request');
    });
  });
});
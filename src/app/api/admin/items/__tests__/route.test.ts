import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { GET, PATCH } from '../route';

// Mock dependencies
vi.mock('@/lib/admin-auth', () => ({
  requireAdminAuth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    item: {
      count: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

const mockRequireAdminAuth = vi.mocked(
  (await import('@/lib/admin-auth')).requireAdminAuth
);
const mockDb = vi.mocked((await import('@/lib/db')).db);

describe('/api/admin/items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('fetches items with pagination and filtering', async () => {
      mockRequireAdminAuth.mockResolvedValueOnce({
        user: { githubUsername: 'mcull' },
      } as any);

      (mockDb.item.count as any).mockResolvedValueOnce(25);

      const mockItems = [
        {
          id: 'item1',
          name: 'Test Item',
          description: 'Test description',
          category: 'tools',
          condition: 'good',
          location: null,
          imageUrl: 'test-image.jpg',
          currentBorrowRequestId: null,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          owner: {
            id: 'owner1',
            name: 'Owner Name',
            email: 'owner@example.com',
            image: null,
          },
          stuffType: {
            displayName: 'Tool',
            category: 'tools',
            iconPath: 'icon.jpg',
          },
          libraries: [],
          borrowRequests: [],
          _count: { borrowRequests: 5 },
        },
      ];

      (mockDb.item.findMany as any).mockResolvedValueOnce(mockItems);

      const request = new NextRequest(
        'http://localhost/api/admin/items?search=test&page=1&limit=50'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0]).toMatchObject({
        id: 'item1',
        name: 'Test Item',
        isAvailable: true,
        totalBorrowRequests: 5,
      });
      expect(data.pagination).toEqual({
        total: 25,
        page: 1,
        limit: 50,
        pages: 1,
      });
    });

    it('requires admin authentication', async () => {
      mockRequireAdminAuth.mockRejectedValueOnce(
        new Error('Admin access denied')
      );

      const request = new NextRequest('http://localhost/api/admin/items');
      const response = await GET(request);

      expect(response.status).toBe(500);
      expect(mockRequireAdminAuth).toHaveBeenCalled();
    });
  });

  describe('PATCH', () => {
    it('handles bulk delete operation', async () => {
      mockRequireAdminAuth.mockResolvedValueOnce({
        user: { githubUsername: 'mcull' },
      } as any);

      (mockDb.item.deleteMany as any).mockResolvedValueOnce({ count: 3 });

      const request = new NextRequest('http://localhost/api/admin/items', {
        method: 'PATCH',
        body: JSON.stringify({
          itemIds: ['item1', 'item2', 'item3'],
          action: 'delete',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        affected: 3,
        action: 'delete',
      });
      expect(mockDb.item.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['item1', 'item2', 'item3'] } },
      });
    });

    it('handles bulk condition update', async () => {
      mockRequireAdminAuth.mockResolvedValueOnce({
        user: { githubUsername: 'mcull' },
      } as any);

      (mockDb.item.updateMany as any).mockResolvedValueOnce({ count: 2 });

      const request = new NextRequest('http://localhost/api/admin/items', {
        method: 'PATCH',
        body: JSON.stringify({
          itemIds: ['item1', 'item2'],
          action: 'updateCondition',
          data: { condition: 'excellent' },
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        affected: 2,
        action: 'updateCondition',
      });
      expect(mockDb.item.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['item1', 'item2'] } },
        data: { condition: 'excellent' },
      });
    });

    it('returns error for invalid action', async () => {
      mockRequireAdminAuth.mockResolvedValueOnce({
        user: { githubUsername: 'mcull' },
      } as any);

      const request = new NextRequest('http://localhost/api/admin/items', {
        method: 'PATCH',
        body: JSON.stringify({
          itemIds: ['item1'],
          action: 'invalid',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid action');
    });

    it('returns error when missing required data', async () => {
      mockRequireAdminAuth.mockResolvedValueOnce({
        user: { githubUsername: 'mcull' },
      } as any);

      const request = new NextRequest('http://localhost/api/admin/items', {
        method: 'PATCH',
        body: JSON.stringify({
          itemIds: ['item1'],
          action: 'updateCondition',
          // Missing data.condition
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Condition is required');
    });

    it('returns error when itemIds is missing', async () => {
      mockRequireAdminAuth.mockResolvedValueOnce({
        user: { githubUsername: 'mcull' },
      } as any);

      const request = new NextRequest('http://localhost/api/admin/items', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'delete',
          // Missing itemIds
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Item IDs are required');
    });
  });
});

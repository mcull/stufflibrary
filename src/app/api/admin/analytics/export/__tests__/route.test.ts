import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock modules before importing them
vi.mock('@/lib/admin-auth');
vi.mock('@/lib/db', () => ({
  db: {
    $queryRaw: vi.fn(),
  },
}));

import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';

import { POST } from '../route';

const mockDb = db as unknown as {
  $queryRaw: ReturnType<typeof vi.fn>;
};
const mockRequireAdminAuth = requireAdminAuth as ReturnType<typeof vi.fn>;

const mockExportData = [
  {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    status: 'active',
    createdAt: '2023-01-01T00:00:00Z',
  },
  {
    id: 'user-2',
    name: 'Another User',
    email: 'another@example.com',
    status: 'active',
    createdAt: '2023-01-02T00:00:00Z',
  },
];

describe('/api/admin/analytics/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({ id: 'admin-1' });
  });

  describe('JSON export', () => {
    it('exports users data as JSON', async () => {
      mockDb.$queryRaw.mockResolvedValueOnce(mockExportData);

      const request = new NextRequest(
        'http://localhost/api/admin/analytics/export',
        {
          method: 'POST',
          body: JSON.stringify({
            format: 'json',
            type: 'users',
            startDate: '2023-01-01',
            endDate: '2023-01-02',
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(mockExportData);
      expect(data.exportInfo.type).toBe('users');
      expect(data.exportInfo.recordCount).toBe(2);
    });

    it('exports items data as JSON', async () => {
      mockDb.$queryRaw.mockResolvedValueOnce(mockExportData);

      const request = new NextRequest(
        'http://localhost/api/admin/analytics/export',
        {
          method: 'POST',
          body: JSON.stringify({
            format: 'json',
            type: 'items',
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.exportInfo.type).toBe('items');
    });

    it('uses default date range when not provided', async () => {
      mockDb.$queryRaw.mockResolvedValueOnce(mockExportData);

      const request = new NextRequest(
        'http://localhost/api/admin/analytics/export',
        {
          method: 'POST',
          body: JSON.stringify({
            format: 'json',
            type: 'users',
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.exportInfo.startDate).toBeDefined();
      expect(data.exportInfo.endDate).toBeDefined();
    });
  });

  describe('CSV export', () => {
    it('exports users data as CSV', async () => {
      mockDb.$queryRaw.mockResolvedValueOnce(mockExportData);

      const request = new NextRequest(
        'http://localhost/api/admin/analytics/export',
        {
          method: 'POST',
          body: JSON.stringify({
            format: 'csv',
            type: 'users',
            startDate: '2023-01-01',
            endDate: '2023-01-02',
          }),
        }
      );

      const response = await POST(request);
      const csvText = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain(
        'attachment'
      );
      expect(response.headers.get('Content-Disposition')).toContain(
        'users_export_'
      );

      // Check CSV structure
      const lines = csvText.split('\n');
      expect(lines[0]).toBe('id,name,email,status,createdAt'); // Headers
      expect(lines[1]).toContain('user-1,Test User,test@example.com');
      expect(lines[2]).toContain('user-2,Another User,another@example.com');
    });

    it('handles CSV special characters', async () => {
      const dataWithSpecialChars = [
        {
          id: 'user-1',
          name: 'Test, User',
          email: 'test@example.com',
          description: 'User with "quotes" and\nnewlines',
        },
      ];
      mockDb.$queryRaw.mockResolvedValueOnce(dataWithSpecialChars);

      const request = new NextRequest(
        'http://localhost/api/admin/analytics/export',
        {
          method: 'POST',
          body: JSON.stringify({
            format: 'csv',
            type: 'users',
          }),
        }
      );

      const response = await POST(request);
      const csvText = await response.text();

      expect(response.status).toBe(200);
      expect(csvText).toContain('"Test, User"'); // Comma in quotes
      expect(csvText).toContain('"User with ""quotes"" and\nnewlines"'); // Escaped quotes
    });

    it('handles null and undefined values in CSV', async () => {
      const dataWithNulls = [
        {
          id: 'user-1',
          name: null,
          email: 'test@example.com',
          description: undefined,
        },
      ];
      mockDb.$queryRaw.mockResolvedValueOnce(dataWithNulls);

      const request = new NextRequest(
        'http://localhost/api/admin/analytics/export',
        {
          method: 'POST',
          body: JSON.stringify({
            format: 'csv',
            type: 'users',
          }),
        }
      );

      const response = await POST(request);
      const csvText = await response.text();

      expect(response.status).toBe(200);
      const lines = csvText.split('\n');
      expect(lines[1]).toBe('user-1,,test@example.com,');
    });
  });

  describe('Error handling', () => {
    it('returns 400 when format is missing', async () => {
      const request = new NextRequest(
        'http://localhost/api/admin/analytics/export',
        {
          method: 'POST',
          body: JSON.stringify({
            type: 'users',
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('format and type are required');
    });

    it('returns 400 when type is missing', async () => {
      const request = new NextRequest(
        'http://localhost/api/admin/analytics/export',
        {
          method: 'POST',
          body: JSON.stringify({
            format: 'json',
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('format and type are required');
    });

    it('returns 400 for invalid export type', async () => {
      const request = new NextRequest(
        'http://localhost/api/admin/analytics/export',
        {
          method: 'POST',
          body: JSON.stringify({
            format: 'json',
            type: 'invalid',
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid export type specified');
    });

    it('returns 400 for unsupported format', async () => {
      const request = new NextRequest(
        'http://localhost/api/admin/analytics/export',
        {
          method: 'POST',
          body: JSON.stringify({
            format: 'xml',
            type: 'users',
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Unsupported format. Use csv or json.');
    });

    it('requires admin authentication', async () => {
      mockRequireAdminAuth.mockRejectedValueOnce(new Error('Unauthorized'));

      const request = new NextRequest(
        'http://localhost/api/admin/analytics/export',
        {
          method: 'POST',
          body: JSON.stringify({
            format: 'json',
            type: 'users',
          }),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('handles database errors', async () => {
      mockDb.$queryRaw.mockRejectedValueOnce(new Error('Database error'));

      const request = new NextRequest(
        'http://localhost/api/admin/analytics/export',
        {
          method: 'POST',
          body: JSON.stringify({
            format: 'json',
            type: 'users',
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database error');
    });
  });

  describe('Export types', () => {
    it('supports borrowRequests export', async () => {
      mockDb.$queryRaw.mockResolvedValueOnce(mockExportData);

      const request = new NextRequest(
        'http://localhost/api/admin/analytics/export',
        {
          method: 'POST',
          body: JSON.stringify({
            format: 'json',
            type: 'borrowRequests',
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.exportInfo.type).toBe('borrowRequests');
    });

    it('supports libraries export', async () => {
      mockDb.$queryRaw.mockResolvedValueOnce(mockExportData);

      const request = new NextRequest(
        'http://localhost/api/admin/analytics/export',
        {
          method: 'POST',
          body: JSON.stringify({
            format: 'json',
            type: 'libraries',
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.exportInfo.type).toBe('libraries');
    });

    it('supports analytics export', async () => {
      // Mock multiple database calls for analytics export
      mockDb.$queryRaw
        .mockResolvedValueOnce([{ category: 'User Metrics', total_users: 100 }])
        .mockResolvedValueOnce([{ category: 'Item Metrics', total_items: 200 }])
        .mockResolvedValueOnce([
          { category: 'Borrow Metrics', total_requests: 50 },
        ])
        .mockResolvedValueOnce([
          { category: 'Library Metrics', total_libraries: 10 },
        ]);

      const request = new NextRequest(
        'http://localhost/api/admin/analytics/export',
        {
          method: 'POST',
          body: JSON.stringify({
            format: 'json',
            type: 'analytics',
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.exportInfo.type).toBe('analytics');
      expect(data.data).toHaveLength(4); // 4 metric categories
    });
  });

  describe('Filters', () => {
    it('applies filters to user export', async () => {
      mockDb.$queryRaw.mockResolvedValueOnce(mockExportData);

      const request = new NextRequest(
        'http://localhost/api/admin/analytics/export',
        {
          method: 'POST',
          body: JSON.stringify({
            format: 'json',
            type: 'users',
            filters: { status: 'active' },
          }),
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(200);
      expect(mockDb.$queryRaw).toHaveBeenCalled();
    });

    it('applies filters to item export', async () => {
      mockDb.$queryRaw.mockResolvedValueOnce(mockExportData);

      const request = new NextRequest(
        'http://localhost/api/admin/analytics/export',
        {
          method: 'POST',
          body: JSON.stringify({
            format: 'json',
            type: 'items',
            filters: { category: 'electronics' },
          }),
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });
});

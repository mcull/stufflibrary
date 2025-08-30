import { ReportStatus, ReportPriority, UserReportReason } from '@prisma/client';
import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the database configuration before importing anything that uses it
vi.mock('@/lib/db-config', () => ({
  getDatabaseConfig: vi.fn(() => ({
    url: 'postgresql://test:test@localhost:5432/test',
    directUrl: undefined,
    environment: 'test',
    isProduction: false,
    allowDestructiveOperations: true,
  })),
  getDatabaseEnvironment: vi.fn(() => 'test'),
  logDatabaseConfig: vi.fn(),
}));

vi.mock('@/lib/admin-auth');
vi.mock('@/lib/db', () => ({
  db: {
    userReport: {
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';

import { GET, PATCH } from '../route';

const mockDb = db as unknown as {
  userReport: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
};
const mockRequireAdminAuth = requireAdminAuth as ReturnType<typeof vi.fn>;

const mockReports = [
  {
    id: 'report-1',
    reason: UserReportReason.INAPPROPRIATE_CONTENT,
    description: 'Test report description',
    status: ReportStatus.PENDING,
    priority: ReportPriority.MEDIUM,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    reviewedAt: null,
    notes: null,
    reporter: {
      id: 'user-1',
      name: 'Reporter User',
      email: 'reporter@example.com',
      image: null,
    },
    reported: {
      id: 'user-2',
      name: 'Reported User',
      email: 'reported@example.com',
      image: null,
      trustScore: 800,
      warningCount: 1,
      suspensionCount: 0,
      isSuspended: false,
    },
    item: null,
    library: null,
  },
];

describe('/api/admin/reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({ id: 'admin-1' });
  });

  describe('GET', () => {
    it('returns reports with pagination', async () => {
      mockDb.userReport.findMany.mockResolvedValueOnce(mockReports);
      mockDb.userReport.count.mockResolvedValueOnce(1);

      const request = new NextRequest(
        'http://localhost/api/admin/reports?page=1&limit=50'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.reports).toHaveLength(1);
      expect(data.pagination.total).toBe(1);
      expect(mockDb.userReport.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          reported: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              trustScore: true,
              warningCount: true,
              suspensionCount: true,
              isSuspended: true,
            },
          },
          item: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          library: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: 0,
        take: 50,
      });
    });

    it('filters reports by search term', async () => {
      mockDb.userReport.findMany.mockResolvedValueOnce(mockReports);
      mockDb.userReport.count.mockResolvedValueOnce(1);

      const request = new NextRequest(
        'http://localhost/api/admin/reports?search=test'
      );
      await GET(request);

      expect(mockDb.userReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { description: { contains: 'test', mode: 'insensitive' } },
              {
                reporter: {
                  OR: [
                    { name: { contains: 'test', mode: 'insensitive' } },
                    { email: { contains: 'test', mode: 'insensitive' } },
                  ],
                },
              },
              {
                reported: {
                  OR: [
                    { name: { contains: 'test', mode: 'insensitive' } },
                    { email: { contains: 'test', mode: 'insensitive' } },
                  ],
                },
              },
            ],
          },
        })
      );
    });

    it('filters reports by status', async () => {
      mockDb.userReport.findMany.mockResolvedValueOnce(mockReports);
      mockDb.userReport.count.mockResolvedValueOnce(1);

      const request = new NextRequest(
        'http://localhost/api/admin/reports?status=PENDING'
      );
      await GET(request);

      expect(mockDb.userReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PENDING' },
        })
      );
    });

    it('requires admin authentication', async () => {
      mockRequireAdminAuth.mockRejectedValueOnce(new Error('Unauthorized'));

      const request = new NextRequest('http://localhost/api/admin/reports');
      const response = await GET(request);

      expect(response.status).toBe(500);
    });

    it('handles database errors', async () => {
      mockDb.userReport.findMany.mockRejectedValueOnce(
        new Error('Database error')
      );

      const request = new NextRequest('http://localhost/api/admin/reports');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch reports');
    });
  });

  describe('PATCH', () => {
    it('resolves reports', async () => {
      mockDb.userReport.updateMany.mockResolvedValueOnce({ count: 2 });

      const request = new NextRequest('http://localhost/api/admin/reports', {
        method: 'PATCH',
        body: JSON.stringify({
          reportIds: ['report-1', 'report-2'],
          action: 'resolve',
          data: { notes: 'Resolved by admin' },
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDb.userReport.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['report-1', 'report-2'] } },
        data: {
          status: ReportStatus.RESOLVED,
          reviewedAt: expect.any(Date),
          notes: 'Resolved by admin',
        },
      });
    });

    it('dismisses reports', async () => {
      mockDb.userReport.updateMany.mockResolvedValueOnce({ count: 1 });

      const request = new NextRequest('http://localhost/api/admin/reports', {
        method: 'PATCH',
        body: JSON.stringify({
          reportIds: ['report-1'],
          action: 'dismiss',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDb.userReport.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['report-1'] } },
        data: {
          status: ReportStatus.DISMISSED,
          reviewedAt: expect.any(Date),
          notes: undefined,
        },
      });
    });

    it('escalates reports', async () => {
      mockDb.userReport.updateMany.mockResolvedValueOnce({ count: 1 });

      const request = new NextRequest('http://localhost/api/admin/reports', {
        method: 'PATCH',
        body: JSON.stringify({
          reportIds: ['report-1'],
          action: 'escalate',
        }),
      });

      await PATCH(request);

      expect(mockDb.userReport.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['report-1'] } },
        data: {
          status: ReportStatus.ESCALATED,
          priority: ReportPriority.HIGH,
          reviewedAt: expect.any(Date),
          notes: undefined,
        },
      });
    });

    it('updates priority', async () => {
      mockDb.userReport.updateMany.mockResolvedValueOnce({ count: 1 });

      const request = new NextRequest('http://localhost/api/admin/reports', {
        method: 'PATCH',
        body: JSON.stringify({
          reportIds: ['report-1'],
          action: 'updatePriority',
          data: { priority: ReportPriority.HIGH },
        }),
      });

      await PATCH(request);

      expect(mockDb.userReport.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['report-1'] } },
        data: { priority: ReportPriority.HIGH },
      });
    });

    it('validates required fields', async () => {
      const request = new NextRequest('http://localhost/api/admin/reports', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'resolve',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Report IDs and action are required');
    });

    it('validates invalid action', async () => {
      const request = new NextRequest('http://localhost/api/admin/reports', {
        method: 'PATCH',
        body: JSON.stringify({
          reportIds: ['report-1'],
          action: 'invalid',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid action');
    });

    it('requires admin authentication', async () => {
      mockRequireAdminAuth.mockRejectedValueOnce(new Error('Unauthorized'));

      const request = new NextRequest('http://localhost/api/admin/reports', {
        method: 'PATCH',
        body: JSON.stringify({
          reportIds: ['report-1'],
          action: 'resolve',
        }),
      });

      await PATCH(request);

      expect(mockRequireAdminAuth).toHaveBeenCalled();
    });

    it('handles database errors', async () => {
      mockDb.userReport.updateMany.mockRejectedValueOnce(
        new Error('Database error')
      );

      const request = new NextRequest('http://localhost/api/admin/reports', {
        method: 'PATCH',
        body: JSON.stringify({
          reportIds: ['report-1'],
          action: 'resolve',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update reports');
    });
  });
});

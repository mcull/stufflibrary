// Admin reports API tests - temporarily disabled until schema is updated
import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';

import { GET, PATCH } from '../route';

// Stub types
type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';
type ReportPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type UserReportReason = 'SPAM' | 'HARASSMENT' | 'INAPPROPRIATE_CONTENT' | 'FRAUD' | 'OTHER';

vi.mock('@/lib/admin-auth');
vi.mock('@/lib/db');

describe('/api/admin/reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns empty reports until schema is implemented', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue(undefined as any);

      const request = new NextRequest('http://localhost:3000/api/admin/reports');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.reports).toEqual([]);
      expect(data.total).toBe(0);
    });

    it('requires admin authentication', async () => {
      vi.mocked(requireAdminAuth).mockRejectedValue(new Error('Unauthorized'));

      const request = new NextRequest('http://localhost:3000/api/admin/reports');
      const response = await GET(request);

      expect(response.status).toBe(500);
    });
  });

  describe('PATCH', () => {
    it('returns 501 until schema is implemented', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue(undefined as any);

      const request = new NextRequest('http://localhost:3000/api/admin/reports', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'REVIEWED' })
      });
      
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(501);
      expect(data.error).toContain('temporarily disabled');
    });
  });
});
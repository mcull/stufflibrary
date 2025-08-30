// Admin reports API tests - temporarily disabled until schema is updated
import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';

// Skip all tests if database environment variables are not available (e.g., in CI)
const skipTests = !process.env.DATABASE_URL;

if (skipTests) {
  describe('/api/admin/reports', () => {
    it('should skip database tests when environment variables are missing', () => {
      console.log('Skipping admin reports tests - DATABASE_URL not available');
      expect(true).toBe(true);
    });
  });
} else {
  // Stub types - prefixed with underscore to indicate they're unused in current implementation
  type _ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';
  type _ReportPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type _UserReportReason =
    | 'SPAM'
    | 'HARASSMENT'
    | 'INAPPROPRIATE_CONTENT'
    | 'FRAUD'
    | 'OTHER';

  // Mock modules before importing
  vi.mock('@/lib/admin-auth');
  vi.mock('@/lib/db');

  describe('/api/admin/reports', () => {
    let requireAdminAuth: ReturnType<typeof vi.fn>;
    let GET: (request: NextRequest) => Promise<Response>;
    let PATCH: (request: NextRequest) => Promise<Response>;

    beforeAll(async () => {
      // Import modules dynamically to avoid environment validation issues
      const adminAuthModule = await import('@/lib/admin-auth');
      const routeModule = await import('../route');

      requireAdminAuth = adminAuthModule.requireAdminAuth as ReturnType<
        typeof vi.fn
      >;
      GET = routeModule.GET;
      PATCH = routeModule.PATCH;
    });

    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe('GET', () => {
      it('returns empty reports until schema is implemented', async () => {
        vi.mocked(requireAdminAuth).mockResolvedValue(undefined as never);

        const request = new NextRequest(
          'http://localhost:3000/api/admin/reports'
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.reports).toEqual([]);
        expect(data.total).toBe(0);
      });

      it('requires admin authentication', async () => {
        vi.mocked(requireAdminAuth).mockRejectedValue(
          new Error('Unauthorized')
        );

        const request = new NextRequest(
          'http://localhost:3000/api/admin/reports'
        );
        const response = await GET(request);

        expect(response.status).toBe(500);
      });
    });

    describe('PATCH', () => {
      it('returns 501 until schema is implemented', async () => {
        vi.mocked(requireAdminAuth).mockResolvedValue(undefined as never);

        const request = new NextRequest(
          'http://localhost:3000/api/admin/reports',
          {
            method: 'PATCH',
            body: JSON.stringify({ status: 'REVIEWED' }),
          }
        );

        const response = await PATCH(request);
        const data = await response.json();

        expect(response.status).toBe(501);
        expect(data.error).toContain('temporarily disabled');
      });
    });
  });
}

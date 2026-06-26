import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockRequireAdminAuth = vi.hoisted(() => vi.fn());
const mockCount = vi.hoisted(() => vi.fn());

vi.mock('@/lib/admin-auth', () => ({
  requireAdminAuth: mockRequireAdminAuth,
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: { count: mockCount },
    item: { count: mockCount },
    collection: { count: mockCount },
    borrowRequest: { count: mockCount },
  },
}));

describe('GET /api/admin/dashboard-metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({ user: { id: 'admin_1' } });
    mockCount.mockResolvedValue(7);
  });

  it('returns 401 when not an admin', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('Admin access denied'));
    const { GET } = await import('../admin/dashboard-metrics/route');
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('returns every metric field the dashboard renders, as numbers', async () => {
    const { GET } = await import('../admin/dashboard-metrics/route');
    const response = await GET();
    const body = await response.json();

    // These keys are consumed by DashboardMetrics -> MetricCard.value.toLocaleString()
    const required = [
      'totalUsers',
      'activeUsers',
      'totalItems',
      'totalLibraries',
      'pendingRequests',
      'suspendedUsers',
      'recentUsers',
      'recentItems',
    ];
    for (const key of required) {
      expect(typeof body.metrics[key], `metrics.${key}`).toBe('number');
    }
  });
});

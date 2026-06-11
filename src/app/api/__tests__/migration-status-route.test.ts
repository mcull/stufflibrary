import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockRequireAdminAuth = vi.hoisted(() => vi.fn());
const mockQueryRawUnsafe = vi.hoisted(() => vi.fn());

vi.mock('@/lib/admin-auth', () => ({
  requireAdminAuth: mockRequireAdminAuth,
}));

vi.mock('@/lib/db', () => ({
  db: {
    $queryRawUnsafe: mockQueryRawUnsafe,
    user: { count: vi.fn().mockResolvedValue(0) },
    collection: { count: vi.fn().mockResolvedValue(0) },
    invitation: { count: vi.fn().mockResolvedValue(0) },
  },
}));

function makeRequest(url = 'http://localhost/api/admin/migration-status') {
  return { nextUrl: new URL(url), headers: new Headers() } as any;
}

describe('GET /api/admin/migration-status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({ user: { id: 'admin_1' } });
    mockQueryRawUnsafe.mockResolvedValue([]);
  });

  it('returns 401 when the caller is not an admin', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('Admin access denied'));
    const { GET } = await import('../admin/migration-status/route');

    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
    expect(mockQueryRawUnsafe).not.toHaveBeenCalled();
  });

  it('ignores admin_key query parameters entirely', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('Admin access denied'));
    process.env.ADMIN_API_KEY = 'secret';
    const { GET } = await import('../admin/migration-status/route');

    const response = await GET(
      makeRequest(
        'http://localhost/api/admin/migration-status?admin_key=secret'
      )
    );

    expect(response.status).toBe(401);
  });

  it('returns status for an authenticated admin session', async () => {
    const { GET } = await import('../admin/migration-status/route');

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(mockRequireAdminAuth).toHaveBeenCalled();
  });
});

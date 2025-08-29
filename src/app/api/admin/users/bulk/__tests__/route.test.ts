import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { POST } from '../route';

// Mock dependencies
vi.mock('@/lib/admin-auth', () => ({
  requireAdminAuth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const mockRequireAdminAuth = vi.mocked(
  (await import('@/lib/admin-auth')).requireAdminAuth
);
const mockDb = vi.mocked((await import('@/lib/db')).db);

describe('/api/admin/users/bulk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles bulk suspend operation', async () => {
    mockRequireAdminAuth.mockResolvedValueOnce({
      user: { githubUsername: 'mcull' },
    } as any);
    (mockDb.user.updateMany as any).mockResolvedValueOnce({ count: 2 });

    const request = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        action: 'suspend',
        userIds: ['user1', 'user2'],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      affected: 2,
      action: 'suspend',
    });
    expect(mockDb.user.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['user1', 'user2'] } },
      data: { status: 'suspended' },
    });
  });

  it('handles bulk export operation', async () => {
    mockRequireAdminAuth.mockResolvedValueOnce({
      user: { githubUsername: 'mcull' },
    } as any);
    const mockUsers = [
      { id: 'user1', name: 'User 1', email: 'user1@example.com' },
      { id: 'user2', name: 'User 2', email: 'user2@example.com' },
    ];
    (mockDb.user.findMany as any).mockResolvedValueOnce(mockUsers);

    const request = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        action: 'export',
        userIds: ['user1', 'user2'],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      users: mockUsers,
      exported: true,
    });
  });

  it('returns error for invalid action', async () => {
    mockRequireAdminAuth.mockResolvedValueOnce({
      user: { githubUsername: 'mcull' },
    } as any);

    const request = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        action: 'invalid',
        userIds: ['user1'],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid action');
  });

  it('returns error when missing required fields', async () => {
    mockRequireAdminAuth.mockResolvedValueOnce({
      user: { githubUsername: 'mcull' },
    } as any);

    const request = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid request');
  });
});

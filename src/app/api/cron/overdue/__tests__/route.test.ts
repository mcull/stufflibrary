import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockFindMany = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockCreateNotification = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({
  db: { borrowRequest: { findMany: mockFindMany, update: mockUpdate } },
}));
vi.mock('@/lib/notification-service', () => ({
  createNotification: mockCreateNotification,
}));

import { GET } from '../route';

function req(auth?: string) {
  return {
    headers: new Headers(auth ? { authorization: auth } : {}),
  } as Request;
}

describe('GET /api/cron/overdue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 's3cret';
    mockFindMany.mockResolvedValue([]);
  });
  it('rejects without the cron secret', async () => {
    const res = await GET(req() as Parameters<typeof GET>[0]);
    expect(res.status).toBe(401);
  });
  it('runs and reports a count with the secret', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'b1',
        status: 'ACTIVE',
        borrowerId: 'u1',
        lenderId: 'u2',
        itemId: 'i1',
        requestedReturnDate: new Date(Date.now() - 86400000),
        lastOverdueReminderAt: null,
        item: { name: 'Drill' },
      },
    ]);
    const res = await GET(req('Bearer s3cret') as Parameters<typeof GET>[0]);
    expect(res.status).toBe(200);
    expect(mockCreateNotification).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalled(); // persists lastOverdueReminderAt
  });
});

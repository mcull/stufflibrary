import { describe, it, expect, vi, beforeEach } from 'vitest';

import { GET } from '../route';

vi.mock('@/lib/admin-auth', () => ({
  requireAdminAuth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    borrowRequest: { findMany: vi.fn() },
  },
}));

const mockRequireAdminAuth = vi.mocked(
  (await import('@/lib/admin-auth')).requireAdminAuth
);
const mockDb = vi.mocked((await import('@/lib/db')).db);
const mockFindMany = mockDb.borrowRequest.findMany as ReturnType<typeof vi.fn>;

const inFlightRow = {
  id: 'br-1',
  status: 'ACTIVE',
  createdAt: new Date('2026-07-06T12:00:00Z'),
  approvedAt: new Date('2026-07-06T14:00:00Z'),
  requestedReturnDate: new Date('2026-07-16T12:00:00Z'),
  returnedAt: null,
  returnCondition: null,
  returnConditionNote: null,
  lastOverdueReminderAt: null,
  borrower: { name: 'Sam T.' },
  lender: { name: 'Nora F.' },
  item: { name: 'Telescope' },
};

const returnedRow = {
  id: 'br-2',
  status: 'RETURNED',
  createdAt: new Date('2026-07-01T09:00:00Z'),
  approvedAt: new Date('2026-07-01T10:00:00Z'),
  requestedReturnDate: new Date('2026-07-12T09:00:00Z'),
  returnedAt: new Date('2026-07-13T08:00:00Z'),
  returnCondition: 'MINOR_WEAR',
  returnConditionNote: 'scuffed handle',
  lastOverdueReminderAt: null,
  borrower: { name: 'Aisha K.' },
  lender: { name: 'Priya S.' },
  item: { name: 'Sewing machine' },
};

describe('/api/admin/borrows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merges in-flight borrows with returns from the last 24h', async () => {
    mockRequireAdminAuth.mockResolvedValueOnce({
      user: { githubUsername: 'mcull' },
    } as never);
    mockFindMany
      .mockResolvedValueOnce([inFlightRow])
      .mockResolvedValueOnce([returnedRow]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({
      id: 'br-1',
      status: 'ACTIVE',
      borrower: { name: 'Sam T.' },
      lender: { name: 'Nora F.' },
      item: { name: 'Telescope' },
    });
    expect(data[1]).toMatchObject({
      id: 'br-2',
      status: 'RETURNED',
      returnCondition: 'MINOR_WEAR',
    });

    // Two queries: every in-flight status, plus RETURNED within 24h.
    expect(mockFindMany).toHaveBeenCalledTimes(2);
    const [inFlightArgs, returnedArgs] = mockFindMany.mock.calls.map(
      (c) => c[0]
    );
    expect(inFlightArgs.where).toEqual({
      status: { in: ['PENDING', 'APPROVED', 'ACTIVE', 'RETURN_PENDING'] },
    });
    expect(returnedArgs.where.status).toBe('RETURNED');
    expect(returnedArgs.where.returnedAt.gte).toBeInstanceOf(Date);
    // The 24h window is what the board's footer line promises.
    const windowMs = Date.now() - returnedArgs.where.returnedAt.gte.getTime();
    expect(windowMs).toBeGreaterThan(23.9 * 60 * 60 * 1000);
    expect(windowMs).toBeLessThan(24.1 * 60 * 60 * 1000);
    for (const args of [inFlightArgs, returnedArgs]) {
      expect(args.take).toBe(100);
      expect(args.orderBy).toEqual({ createdAt: 'desc' });
      expect(args.select.borrower).toEqual({ select: { name: true } });
      expect(args.select.lender).toEqual({ select: { name: true } });
      expect(args.select.item).toEqual({ select: { name: true } });
    }
  });

  it('requires admin authentication', async () => {
    mockRequireAdminAuth.mockRejectedValueOnce(
      new Error('Admin access denied')
    );

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mockRequireAdminAuth).toHaveBeenCalled();
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});

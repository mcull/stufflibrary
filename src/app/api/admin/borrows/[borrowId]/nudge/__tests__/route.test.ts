import { describe, it, expect, vi, beforeEach } from 'vitest';

import { POST } from '../route';

vi.mock('@/lib/admin-auth', () => ({
  requireAdminAuth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    borrowRequest: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('@/lib/notification-service', () => ({
  createNotification: vi.fn(),
}));

const mockRequireAdminAuth = vi.mocked(
  (await import('@/lib/admin-auth')).requireAdminAuth
);
const mockDb = vi.mocked((await import('@/lib/db')).db);
const mockFindUnique = mockDb.borrowRequest.findUnique as ReturnType<
  typeof vi.fn
>;
const mockUpdate = mockDb.borrowRequest.update as ReturnType<typeof vi.fn>;
const mockCreateNotification = vi.mocked(
  (await import('@/lib/notification-service')).createNotification
);

const HOUR = 60 * 60 * 1000;
const hoursAgo = (n: number) => new Date(Date.now() - n * HOUR);

const baseBorrow = {
  id: 'br-1',
  borrowerId: 'u-borrower',
  lenderId: 'u-lender',
  lastOverdueReminderAt: null,
  borrower: { name: 'Sam T.' },
  lender: { name: 'Nora F.' },
  item: { name: 'Telescope' },
};

function prime(borrow: unknown) {
  mockRequireAdminAuth.mockResolvedValueOnce({
    user: { githubUsername: 'mcull' },
  } as never);
  mockFindUnique.mockResolvedValueOnce(borrow);
}

const post = (borrowId = 'br-1') =>
  POST(
    new Request(`http://localhost:3000/api/admin/borrows/${borrowId}/nudge`, {
      method: 'POST',
    }),
    { params: Promise.resolve({ borrowId }) }
  );

describe('POST /api/admin/borrows/[borrowId]/nudge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires admin authentication', async () => {
    mockRequireAdminAuth.mockRejectedValueOnce(
      new Error('Admin access denied')
    );

    const response = await post();

    expect(response.status).toBe(401);
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('404s on a borrow the desk has no record of', async () => {
    prime(null);

    const response = await post('br-missing');

    expect(response.status).toBe(404);
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('reminds the lender when a request has waited over a day', async () => {
    prime({
      ...baseBorrow,
      status: 'PENDING',
      createdAt: hoursAgo(30),
      requestedReturnDate: hoursAgo(-7 * 24),
    });
    mockCreateNotification.mockResolvedValueOnce({} as never);
    mockUpdate.mockResolvedValueOnce({} as never);

    const response = await post();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ ok: true, kind: 'REMIND_OWNER' });

    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    const notif = mockCreateNotification.mock.calls[0]![0];
    // The reminder goes to the LENDER, on the type their inbox filters know.
    expect(notif.userId).toBe('u-lender');
    expect(notif.type).toBe('BORROW_REQUEST_RECEIVED');
    expect(notif.title).toBe('Still waiting: Sam T. asked to borrow Telescope');
    expect(notif.message).toMatch(
      /^A gentle reminder from the front desk — Sam T\.'s request has been waiting since [A-Z][a-z]{2} \d{1,2}\.$/
    );
    // The same route a fresh request points the lender at.
    expect(notif.actionUrl).toBe('/borrow-approval/br-1');
    expect(notif.relatedRequestId).toBe('br-1');

    // The shared throttle field records this reminder.
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'br-1' },
      data: { lastOverdueReminderAt: expect.any(Date) },
    });
  });

  it('nudges the borrower on an overdue loan, in the cron reminder voice', async () => {
    prime({
      ...baseBorrow,
      status: 'ACTIVE',
      createdAt: hoursAgo(10 * 24),
      requestedReturnDate: hoursAgo(2 * 24),
    });
    mockCreateNotification.mockResolvedValueOnce({} as never);
    mockUpdate.mockResolvedValueOnce({} as never);

    const response = await post();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ ok: true, kind: 'NUDGE_BORROWER' });

    // Word-for-word the cron's overdue reminder — an admin nudge and a
    // system reminder must read the same to the member.
    expect(mockCreateNotification).toHaveBeenCalledWith({
      userId: 'u-borrower',
      type: 'ITEM_OVERDUE',
      title: 'Item overdue',
      message: '"Telescope" is past its return date. Please return it.',
      relatedRequestId: 'br-1',
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'br-1' },
      data: { lastOverdueReminderAt: expect.any(Date) },
    });
  });

  it('409s when there is nothing to nudge', async () => {
    prime({
      ...baseBorrow,
      status: 'PENDING',
      createdAt: hoursAgo(3),
      requestedReturnDate: hoursAgo(-7 * 24),
    });

    const response = await post();
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data).toEqual({ error: 'nothing to nudge' });
    expect(mockCreateNotification).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('429s when a reminder already went out within 20h', async () => {
    const lastAt = hoursAgo(2);
    prime({
      ...baseBorrow,
      status: 'ACTIVE',
      createdAt: hoursAgo(10 * 24),
      requestedReturnDate: hoursAgo(2 * 24),
      lastOverdueReminderAt: lastAt,
    });

    const response = await post();
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data).toEqual({
      error: 'reminded recently',
      lastOverdueReminderAt: lastAt.toISOString(),
    });
    expect(mockCreateNotification).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

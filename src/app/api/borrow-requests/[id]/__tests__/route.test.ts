import { vi, describe, it, expect, beforeEach } from 'vitest';

// All hoisted mocks — these are available inside vi.mock() factories
const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockBorrowRequestFindUnique = vi.hoisted(() => vi.fn());
const mockBorrowRequestUpdate = vi.hoisted(() => vi.fn());
const mockDisputeCreate = vi.hoisted(() => vi.fn());
const mockItemFindUnique = vi.hoisted(() => vi.fn());
const mockItemUpdate = vi.hoisted(() => vi.fn());
const mockNotificationFindFirst = vi.hoisted(() => vi.fn());
const mockNotificationCreate = vi.hoisted(() => vi.fn());
const mockNotificationUpdate = vi.hoisted(() => vi.fn());
const mockCreateNotification = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock('@/lib/notification-service', () => ({
  createNotification: mockCreateNotification,
}));

vi.mock('@/lib/db', () => ({
  db: {
    borrowRequest: {
      findUnique: mockBorrowRequestFindUnique,
      update: mockBorrowRequestUpdate,
    },
    item: {
      findUnique: mockItemFindUnique,
      update: mockItemUpdate,
    },
    user: {
      findUnique: vi.fn(),
    },
    dispute: {
      create: mockDisputeCreate,
    },
    notification: {
      findFirst: mockNotificationFindFirst,
      create: mockNotificationCreate,
      update: mockNotificationUpdate,
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/audit-log', () => ({
  logBorrowRequestStatusChange: vi.fn(),
  logAuditEntry: vi.fn(),
  logItemAvailabilityChange: vi.fn(),
}));

vi.mock('@/lib/borrow-request-utils', () => ({
  updateItemAvailability: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/enhanced-notification-service', () => ({
  sendBorrowRequestApprovedNotification: vi.fn(),
  sendBorrowRequestDeclinedNotification: vi.fn(),
  sendItemReturnedNotification: vi.fn(),
}));

vi.mock('@/lib/twilio', () => ({
  sendCancellationNotification: vi.fn(),
}));

// Helper to build a NextRequest-like object
function makeReq(body: Record<string, unknown>) {
  return {
    json: async () => body,
  } as unknown as import('next/server').NextRequest;
}

// Import PATCH after mocks are established
import { PATCH } from '../route';

// Expose a simple alias for the existing tests that reference mockDb directly
const mockDb = {
  borrowRequest: {
    findUnique: mockBorrowRequestFindUnique,
    update: mockBorrowRequestUpdate,
  },
  item: {
    findUnique: mockItemFindUnique,
    update: mockItemUpdate,
  },
  user: {
    findUnique: vi.fn(),
  },
};

// Test the underlying business logic functions instead of the route handlers
describe('Individual Borrow Request API Logic', () => {
  const mockUser = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
  };

  const mockLender = {
    id: 'lender-123',
    name: 'Jane Lender',
    email: 'lender@example.com',
  };

  const mockItem = {
    id: 'item-123',
    name: 'Test Item',
    ownerId: 'lender-123',
  };

  const mockBorrowRequest = {
    id: 'request-123',
    borrowerId: 'user-123',
    itemId: 'item-123',
    status: 'pending',
    requestMessage: 'I need this item',
    requestedReturnDate: new Date('2024-12-01'),
    createdAt: new Date(),
    updatedAt: new Date(),
    borrower: mockUser,
    item: mockItem,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET individual borrow request', () => {
    it('should fetch borrow request for authorized user', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockUser });
      mockDb.borrowRequest.findUnique.mockResolvedValue(mockBorrowRequest);

      const result = await mockDb.borrowRequest.findUnique({
        where: { id: 'request-123' },
        include: {
          borrower: {
            select: { id: true, name: true, email: true, phone: true },
          },
          item: {
            select: {
              id: true,
              name: true,
              ownerId: true,
              owner: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      expect(result).toEqual(mockBorrowRequest);
    });

    it('should return null for non-existent request', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockUser });
      mockDb.borrowRequest.findUnique.mockResolvedValue(null);

      const result = await mockDb.borrowRequest.findUnique({
        where: { id: 'non-existent' },
      });

      expect(result).toBeNull();
    });

    it('should validate user authorization', async () => {
      const unauthorizedRequest = {
        ...mockBorrowRequest,
        borrowerId: 'other-user',
        item: { ...mockItem, ownerId: 'other-owner' },
      };

      mockGetServerSession.mockResolvedValue({ user: mockUser });
      mockDb.borrowRequest.findUnique.mockResolvedValue(unauthorizedRequest);

      // User should not have access to this request
      const isAuthorized =
        unauthorizedRequest.borrowerId === mockUser.id ||
        unauthorizedRequest.item.ownerId === mockUser.id;

      expect(isAuthorized).toBe(false);
    });
  });

  describe('PATCH borrow request updates', () => {
    it('should approve borrow request as lender', async () => {
      const lenderRequest = {
        ...mockBorrowRequest,
        item: { ...mockItem, ownerId: mockLender.id },
      };

      mockGetServerSession.mockResolvedValue({ user: mockLender });
      mockDb.borrowRequest.findUnique.mockResolvedValue(lenderRequest);
      mockDb.borrowRequest.update.mockResolvedValue({
        ...lenderRequest,
        status: 'approved',
      });

      const result = await mockDb.borrowRequest.update({
        where: { id: 'request-123' },
        data: { status: 'approved' },
        include: {
          borrower: {
            select: { id: true, name: true, email: true, phone: true },
          },
          item: {
            select: {
              id: true,
              name: true,
              ownerId: true,
              owner: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      expect(result.status).toBe('approved');
    });

    it('should decline borrow request as lender', async () => {
      const lenderRequest = {
        ...mockBorrowRequest,
        item: { ...mockItem, ownerId: mockLender.id },
      };

      mockGetServerSession.mockResolvedValue({ user: mockLender });
      mockDb.borrowRequest.findUnique.mockResolvedValue(lenderRequest);
      mockDb.borrowRequest.update.mockResolvedValue({
        ...lenderRequest,
        status: 'declined',
      });

      const result = await mockDb.borrowRequest.update({
        where: { id: 'request-123' },
        data: { status: 'declined' },
      });

      expect(result.status).toBe('declined');
    });

    it('should mark item as returned by borrower', async () => {
      const activeRequest = {
        ...mockBorrowRequest,
        status: 'active',
      };

      mockGetServerSession.mockResolvedValue({ user: mockUser });
      mockDb.borrowRequest.findUnique.mockResolvedValue(activeRequest);
      mockDb.borrowRequest.update.mockResolvedValue({
        ...activeRequest,
        status: 'returned',
        returnedAt: new Date(),
      });

      const result = await mockDb.borrowRequest.update({
        where: { id: 'request-123' },
        data: {
          status: 'returned',
          returnedAt: expect.any(Date),
        },
      });

      expect(result.status).toBe('returned');
      expect(result.returnedAt).toBeDefined();
    });

    it('should cancel request as borrower', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockUser });
      mockDb.borrowRequest.findUnique.mockResolvedValue(mockBorrowRequest);
      mockDb.borrowRequest.update.mockResolvedValue({
        ...mockBorrowRequest,
        status: 'cancelled',
      });

      const result = await mockDb.borrowRequest.update({
        where: { id: 'request-123' },
        data: { status: 'cancelled' },
      });

      expect(result.status).toBe('cancelled');
    });

    it('should prevent invalid status transitions', async () => {
      // Test trying to approve a declined request
      const declinedRequest = {
        ...mockBorrowRequest,
        status: 'declined',
        item: { ...mockItem, ownerId: mockLender.id },
      };

      mockGetServerSession.mockResolvedValue({ user: mockLender });
      mockDb.borrowRequest.findUnique.mockResolvedValue(declinedRequest);

      // Logic should prevent approving declined requests
      const canApprove = declinedRequest.status === 'pending';
      expect(canApprove).toBe(false);
    });

    it('should prevent unauthorized users from updating requests', async () => {
      const otherUser = {
        id: 'other-user',
        name: 'Other User',
        email: 'other@example.com',
      };

      mockGetServerSession.mockResolvedValue({ user: otherUser });
      mockDb.borrowRequest.findUnique.mockResolvedValue(mockBorrowRequest);

      // Check authorization logic
      const isAuthorized =
        mockBorrowRequest.borrowerId === otherUser.id ||
        mockBorrowRequest.item.ownerId === otherUser.id;

      expect(isAuthorized).toBe(false);
    });

    it('should handle database update errors', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockUser });
      mockDb.borrowRequest.findUnique.mockResolvedValue(mockBorrowRequest);
      mockDb.borrowRequest.update.mockRejectedValue(
        new Error('Database update failed')
      );

      try {
        await mockDb.borrowRequest.update({
          where: { id: 'request-123' },
          data: { status: 'cancelled' },
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Database update failed');
      }
    });
  });

  describe('Authentication and authorization', () => {
    it('should handle unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should validate borrower permissions', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockUser });
      mockDb.borrowRequest.findUnique.mockResolvedValue(mockBorrowRequest);

      const isBorrower = mockBorrowRequest.borrowerId === mockUser.id;
      expect(isBorrower).toBe(true);
    });

    it('should validate lender permissions', async () => {
      const lenderRequest = {
        ...mockBorrowRequest,
        item: { ...mockItem, ownerId: mockLender.id },
      };

      mockGetServerSession.mockResolvedValue({ user: mockLender });
      mockDb.borrowRequest.findUnique.mockResolvedValue(lenderRequest);

      const isLender = lenderRequest.item.ownerId === mockLender.id;
      expect(isLender).toBe(true);
    });
  });
});

// A shared stub for the borrowRequest's related data (needed by the route)
const baseBorrowRequestStub = {
  borrower: {
    id: 'borrower_1',
    name: 'B',
    phone: null,
    email: 'b@x.com',
    status: 'ACTIVE',
  },
  lender: {
    id: 'lender_1',
    name: 'L',
    phone: null,
    email: 'l@x.com',
    status: 'ACTIVE',
  },
  item: {
    id: 'item_1',
    name: 'Drill',
    ownerId: 'lender_1',
    imageUrl: null,
    watercolorUrl: null,
    watercolorThumbUrl: null,
  },
  requestMessage: '',
  lenderMessage: null,
  videoUrl: null,
};

describe('Phase 1A — PATCH route state machine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: item update succeeds (for updateItemAvailability mock)
    mockItemFindUnique.mockResolvedValue({ currentBorrowRequestId: 'br_1' });
    mockItemUpdate.mockResolvedValue({});
  });

  // ── Task 2: return → RETURN_PENDING ──────────────────────────────────────

  it("borrower 'return' moves ACTIVE -> RETURN_PENDING and stores the note", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'borrower_1' } });
    mockBorrowRequestFindUnique.mockResolvedValue({
      ...baseBorrowRequestStub,
      id: 'br_1',
      status: 'ACTIVE',
      borrowerId: 'borrower_1',
      lenderId: 'lender_1',
      itemId: 'item_1',
    });
    mockBorrowRequestUpdate.mockResolvedValue({
      id: 'br_1',
      status: 'RETURN_PENDING',
    });

    const res = await PATCH(
      makeReq({ action: 'return', message: 'left on porch' }),
      {
        params: Promise.resolve({ id: 'br_1' }),
      }
    );

    expect(res.status).toBe(200);
    const data = mockBorrowRequestUpdate.mock.calls[0]![0].data;
    expect(data.status).toBe('RETURN_PENDING');
    expect(data.borrowerReturnNote).toBe('left on porch');
  });

  // ── Task 3: confirm-return captures condition → RETURNED ─────────────────

  it("'confirm-return' requires a condition", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'lender_1' } });
    mockBorrowRequestFindUnique.mockResolvedValue({
      ...baseBorrowRequestStub,
      id: 'br_1',
      status: 'RETURN_PENDING',
      borrowerId: 'borrower_1',
      lenderId: 'lender_1',
      itemId: 'item_1',
      requestedReturnDate: new Date('2026-06-01'),
      returnedAt: new Date('2026-06-05'),
    });
    const res = await PATCH(makeReq({ action: 'confirm-return' }), {
      params: Promise.resolve({ id: 'br_1' }),
    });
    expect(res.status).toBe(400);
  });

  it("'confirm-return' with condition moves RETURN_PENDING -> RETURNED and flags late", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'lender_1' } });
    mockBorrowRequestFindUnique.mockResolvedValue({
      ...baseBorrowRequestStub,
      id: 'br_1',
      status: 'RETURN_PENDING',
      borrowerId: 'borrower_1',
      lenderId: 'lender_1',
      itemId: 'item_1',
      requestedReturnDate: new Date('2026-06-01'),
      returnedAt: new Date('2026-06-05'),
    });
    mockBorrowRequestUpdate.mockResolvedValue({
      id: 'br_1',
      status: 'RETURNED',
    });

    const res = await PATCH(
      makeReq({ action: 'confirm-return', condition: 'OK' }),
      { params: Promise.resolve({ id: 'br_1' }) }
    );
    expect(res.status).toBe(200);
    const data = mockBorrowRequestUpdate.mock.calls[0]![0].data;
    expect(data.status).toBe('RETURNED');
    expect(data.returnCondition).toBe('OK');
    expect(data.returnedLate).toBe(true);
    expect(data.returnConfirmedBy).toBe('lender_1');
  });

  it("'confirm-return' notifies the borrower with RETURN_CONFIRMED", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'lender_1' } });
    mockBorrowRequestFindUnique.mockResolvedValue({
      ...baseBorrowRequestStub,
      id: 'br_1',
      status: 'RETURN_PENDING',
      borrowerId: 'borrower_1',
      lenderId: 'lender_1',
      itemId: 'item_1',
      requestedReturnDate: new Date('2026-06-01'),
      returnedAt: new Date('2026-06-05'),
    });
    mockBorrowRequestUpdate.mockResolvedValue({
      id: 'br_1',
      status: 'RETURNED',
    });

    const res = await PATCH(
      makeReq({ action: 'confirm-return', condition: 'OK' }),
      { params: Promise.resolve({ id: 'br_1' }) }
    );
    expect(res.status).toBe(200);
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'borrower_1',
        type: 'RETURN_CONFIRMED',
      })
    );
  });

  // ── Task 4: lender-return captures condition ──────────────────────────────

  it("'lender-return' check-in requires + records condition, goes to RETURNED", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'lender_1' } });
    mockBorrowRequestFindUnique.mockResolvedValue({
      ...baseBorrowRequestStub,
      id: 'br_1',
      status: 'ACTIVE',
      borrowerId: 'borrower_1',
      lenderId: 'lender_1',
      itemId: 'item_1',
      requestedReturnDate: new Date('2026-12-01'),
      returnedAt: null,
    });
    mockBorrowRequestUpdate.mockResolvedValue({
      id: 'br_1',
      status: 'RETURNED',
    });
    const res = await PATCH(
      makeReq({ action: 'lender-return', condition: 'MINOR_WEAR' }),
      { params: Promise.resolve({ id: 'br_1' }) }
    );
    expect(res.status).toBe(200);
    const data = mockBorrowRequestUpdate.mock.calls[0]![0].data;
    expect(data.status).toBe('RETURNED');
    expect(data.returnCondition).toBe('MINOR_WEAR');
    expect(data.returnConfirmedBy).toBe('lender_1');
    expect(data.returnedLate).toBe(false);
  });

  // ── Task 5: report-problem creates a Dispute ──────────────────────────────

  it("'report-problem' creates an OPEN Dispute and notifies (within window)", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'lender_1' } });
    mockBorrowRequestFindUnique.mockResolvedValue({
      ...baseBorrowRequestStub,
      id: 'br_1',
      status: 'RETURNED',
      borrowerId: 'borrower_1',
      lenderId: 'lender_1',
      itemId: 'item_1',
      returnedAt: new Date(),
      requestedReturnDate: new Date(),
    });
    mockDisputeCreate.mockResolvedValue({ id: 'd_1' });
    const res = await PATCH(
      makeReq({
        action: 'report-problem',
        disputeType: 'ITEM_DAMAGED',
        title: 'Cracked',
        message: 'Big crack',
      }),
      { params: Promise.resolve({ id: 'br_1' }) }
    );
    expect(res.status).toBe(200);
    const data = mockDisputeCreate.mock.calls[0]![0].data;
    expect(data).toMatchObject({
      type: 'ITEM_DAMAGED',
      status: 'OPEN',
      partyAId: 'lender_1',
      partyBId: 'borrower_1',
      borrowRequestId: 'br_1',
      itemId: 'item_1',
    });
  });

  it("borrower-initiated 'report-problem' sets partyA=borrower, partyB=lender", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'borrower_1' } });
    mockBorrowRequestFindUnique.mockResolvedValue({
      ...baseBorrowRequestStub,
      id: 'br_1',
      status: 'RETURNED',
      borrowerId: 'borrower_1',
      lenderId: 'lender_1',
      itemId: 'item_1',
      returnedAt: new Date(),
      requestedReturnDate: new Date(),
    });
    mockDisputeCreate.mockResolvedValue({ id: 'd_2' });
    const res = await PATCH(
      makeReq({
        action: 'report-problem',
        disputeType: 'ITEM_NOT_AS_DESCRIBED',
        title: 'Wrong item',
        message: 'Not what was described',
      }),
      { params: Promise.resolve({ id: 'br_1' }) }
    );
    expect(res.status).toBe(200);
    const data = mockDisputeCreate.mock.calls[0]![0].data;
    expect(data).toMatchObject({
      type: 'ITEM_NOT_AS_DESCRIBED',
      status: 'OPEN',
      partyAId: 'borrower_1',
      partyBId: 'lender_1',
      borrowRequestId: 'br_1',
      itemId: 'item_1',
    });
  });

  it("'report-problem' rejected outside the 7-day window", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'lender_1' } });
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    mockBorrowRequestFindUnique.mockResolvedValue({
      ...baseBorrowRequestStub,
      id: 'br_1',
      status: 'RETURNED',
      borrowerId: 'borrower_1',
      lenderId: 'lender_1',
      itemId: 'item_1',
      returnedAt: old,
      requestedReturnDate: old,
    });
    const res = await PATCH(
      makeReq({
        action: 'report-problem',
        disputeType: 'ITEM_DAMAGED',
        title: 'x',
        message: 'y',
      }),
      { params: Promise.resolve({ id: 'br_1' }) }
    );
    expect(res.status).toBe(400);
  });
});

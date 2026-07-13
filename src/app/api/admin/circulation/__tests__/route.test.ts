import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { GET } from '../route';

// Mock dependencies
vi.mock('@/lib/admin-auth', () => ({
  requireAdminAuth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    borrowRequest: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
    auditLog: { findMany: vi.fn() },
    invitation: { findMany: vi.fn() },
  },
}));

const mockRequireAdminAuth = vi.mocked(
  (await import('@/lib/admin-auth')).requireAdminAuth
);
const mockDb = vi.mocked((await import('@/lib/db')).db);

function primeHappyPath() {
  mockRequireAdminAuth.mockResolvedValueOnce({
    user: { githubUsername: 'mcull' },
  } as never);

  (mockDb.borrowRequest.findMany as ReturnType<typeof vi.fn>)
    // First call: open borrows (PENDING/APPROVED/ACTIVE)
    .mockResolvedValueOnce([
      {
        id: 'br1',
        status: 'APPROVED',
        createdAt: new Date('2026-07-11T09:00:00Z'),
        updatedAt: new Date('2026-07-12T14:00:00Z'),
        approvedAt: new Date('2026-07-12T14:00:00Z'),
        requestedReturnDate: new Date('2026-07-20T12:00:00Z'),
        borrower: { name: null }, // actor fallback must kick in
        item: { name: 'Ladder' },
      },
      {
        id: 'br2',
        status: 'PENDING',
        createdAt: new Date('2026-07-12T10:00:00Z'),
        updatedAt: new Date('2026-07-12T10:00:00Z'),
        approvedAt: null,
        requestedReturnDate: new Date('2026-07-25T12:00:00Z'),
        borrower: { name: 'Priya' },
        item: { name: 'Stand Mixer' },
      },
    ])
    // Second call: returned borrows
    .mockResolvedValueOnce([
      {
        id: 'br3',
        updatedAt: new Date('2026-07-12T13:00:00Z'),
        returnedAt: new Date('2026-07-12T13:00:00Z'),
        returnCondition: 'OK',
        borrower: { name: 'Sam' },
        item: { name: 'Post Hole Digger' },
      },
    ]);

  (mockDb.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
    { id: 'u1', name: 'Maya', createdAt: new Date('2026-07-12T15:00:00Z') },
  ]);

  (mockDb.auditLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
    {
      id: 'al1',
      createdAt: new Date('2026-07-12T12:00:00Z'),
      metadata: {
        status: 'ok',
        model: 'gemini-image',
        cost_cents: 4,
        itemId: 'item9',
      },
    },
    {
      id: 'al2',
      createdAt: new Date('2026-07-12T12:30:00Z'),
      metadata: {
        status: 'error',
        model: 'gemini-image',
        cost_cents: 0,
        error_message: 'boom',
      },
    },
  ]);

  (
    mockDb.invitation.findMany as ReturnType<typeof vi.fn>
  ).mockResolvedValueOnce([
    {
      id: 'inv1',
      sentAt: new Date('2026-07-12T11:00:00Z'),
      createdAt: new Date('2026-07-12T11:00:00Z'),
      sender: { name: 'Ravi' },
      collection: { name: 'Maple Street' },
    },
  ]);
}

describe('/api/admin/circulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('merges all sources, sorted newest first, with the right stamps', async () => {
      primeHappyPath();

      const request = new NextRequest(
        'http://localhost:3000/api/admin/circulation'
      );
      const response = await GET(request);
      const rows = await response.json();

      expect(response.status).toBe(200);
      // 2 open borrows + 1 return + 1 join + 1 ok render + 1 invite;
      // the failed render is excluded.
      expect(rows).toHaveLength(6);
      expect(
        rows.every(
          (r: { id: string }) => !r.id.includes('al2') // failed render absent
        )
      ).toBe(true);

      // Newest first
      const times = rows.map((r: { at: string }) =>
        new Date(r.at).getTime()
      ) as number[];
      expect(times).toEqual([...times].sort((a, b) => b - a));

      expect(rows[0]).toMatchObject({
        text: 'Maya joined StuffLibrary',
        stamp: { label: 'NEW MEMBER' },
      });
      // Actor fallback: borrower.name null must never render as 'undefined'
      expect(rows[1]).toMatchObject({
        text: 'A member borrowed Ladder',
        sub: 'due Jul 20',
        stamp: { label: 'BORROWED' },
      });
      expect(rows[2]).toMatchObject({
        text: 'Sam returned Post Hole Digger',
        sub: 'condition: ok',
        stamp: { label: 'RETURNED' },
      });
      expect(rows[3]).toMatchObject({
        sub: '$0.04 · gemini-image',
        stamp: { label: 'PAINTED' },
      });
      expect(rows[4]).toMatchObject({
        text: 'Ravi invited a neighbor',
        sub: 'Maple Street',
        stamp: { label: 'INVITED' },
      });
      expect(rows[5]).toMatchObject({
        text: 'Priya asked to borrow Stand Mixer',
        stamp: { label: 'REQUESTED' },
      });
    });

    it('respects the limit param', async () => {
      primeHappyPath();

      const request = new NextRequest(
        'http://localhost:3000/api/admin/circulation?limit=2'
      );
      const response = await GET(request);
      const rows = await response.json();

      expect(rows).toHaveLength(2);
      expect(rows[0].stamp.label).toBe('NEW MEMBER');
      expect(rows[1].stamp.label).toBe('BORROWED');
    });

    it('requires admin authentication', async () => {
      mockRequireAdminAuth.mockRejectedValueOnce(
        new Error('Admin access denied')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/admin/circulation'
      );
      const response = await GET(request);

      expect(response.status).toBe(401);
      expect(mockRequireAdminAuth).toHaveBeenCalled();
    });
  });
});

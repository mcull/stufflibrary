import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockCollectionFindFirst = vi.hoisted(() => vi.fn());
const mockInvitationFindMany = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({
  db: {
    collection: { findFirst: mockCollectionFindFirst },
    invitation: { findMany: mockInvitationFindMany },
  },
}));

import { GET } from '../route';

function call(id = 'lib_1') {
  const request = new NextRequest(
    `http://localhost/api/collections/${id}/invitations`
  );
  return GET(request, { params: Promise.resolve({ id }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } });
  mockCollectionFindFirst.mockResolvedValue({ id: 'lib_1' });
});

describe('GET /api/collections/[id]/invitations', () => {
  it('includes openedAt in each transformed invitation', async () => {
    const opened = new Date('2026-07-27T00:00:00.000Z');
    mockInvitationFindMany.mockResolvedValue([
      {
        id: 'inv_1',
        email: 'nora@example.com',
        status: 'SENT',
        createdAt: new Date('2026-07-26T00:00:00.000Z'),
        sentAt: new Date('2026-07-26T00:00:00.000Z'),
        openedAt: opened,
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        sender: { name: 'Marc', email: 'marc@example.com' },
        receiver: null,
      },
    ]);

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.invitations).toHaveLength(1);
    expect(body.invitations[0].openedAt).toBe(opened.toISOString());
  });
});

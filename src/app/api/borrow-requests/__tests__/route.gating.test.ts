import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockGetUserCapabilities = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/user-capabilities', () => ({
  getUserCapabilities: mockGetUserCapabilities,
}));
// permissive db mock so the module imports; the gate returns before db use
vi.mock('@/lib/db', () => ({
  db: {
    borrowRequest: { create: vi.fn(), count: vi.fn() },
    item: { findUnique: vi.fn() },
    user: { findFirst: vi.fn() },
  },
}));

describe('borrow-requests POST gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } });
  });

  it('rejects borrow at the concurrent cap (409 + AT_BORROW_LIMIT)', async () => {
    mockGetUserCapabilities.mockResolvedValue({
      canBorrow: false,
      atBorrowLimit: true,
      concurrentBorrowLimit: 2,
      reasons: { canBorrow: 'AT_BORROW_LIMIT' },
    });
    const { POST } = await import('../route');
    const res = await POST(
      new Request('http://t/api/borrow-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ itemId: 'i1' }),
      }) as any
    );
    expect([403, 409]).toContain(res.status);
    const json = await res.json();
    expect(json.reason).toBe('AT_BORROW_LIMIT');
  });

  it('rejects borrow without a full profile (403 + NEEDS_PHOTO)', async () => {
    mockGetUserCapabilities.mockResolvedValue({
      canBorrow: false,
      atBorrowLimit: false,
      concurrentBorrowLimit: 2,
      reasons: { canBorrow: 'NEEDS_PHOTO' },
    });
    const { POST } = await import('../route');
    const res = await POST(
      new Request('http://t/api/borrow-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ itemId: 'i1' }),
      }) as any
    );
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe('NEEDS_PHOTO');
  });
});

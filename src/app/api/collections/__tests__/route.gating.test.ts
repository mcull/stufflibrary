import { it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockGetUserCapabilities = vi.hoisted(() => vi.fn());
vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/user-capabilities', () => ({
  getUserCapabilities: mockGetUserCapabilities,
}));
vi.mock('@/lib/db', () => ({
  db: { collection: { create: vi.fn() }, user: { findUnique: vi.fn() } },
}));

beforeEach(() => vi.clearAllMocks());

it('rejects creating a library without a full profile (403 + reason)', async () => {
  mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } });
  mockGetUserCapabilities.mockResolvedValue({
    canCreateLibrary: false,
    reasons: { canCreateLibrary: 'NEEDS_ADDRESS' },
  });
  const { POST } = await import('../route');
  const res = await POST(
    new Request('http://t/api/collections', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'L' }),
    }) as any
  );
  expect(res.status).toBe(403);
  expect((await res.json()).reason).toBe('NEEDS_ADDRESS');
});

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockGetUserCapabilities = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/user-capabilities', () => ({
  getUserCapabilities: mockGetUserCapabilities,
}));
// Provide a permissive db mock so the module imports; the gate returns before using it.
vi.mock('@/lib/db', () => ({
  db: { item: { create: vi.fn() }, user: { findUnique: vi.fn() } },
}));

import { POST } from '../route';

describe('items POST profile gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } });
  });

  it('rejects lending without a full profile (403 + reason)', async () => {
    mockGetUserCapabilities.mockResolvedValue({
      canLend: false,
      reasons: { canLend: 'NEEDS_PHOTO' },
    });
    const res = await POST(
      new Request('http://t/api/items', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      }) as any
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.reason).toBe('NEEDS_PHOTO');
  });
});

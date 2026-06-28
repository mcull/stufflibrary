import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockUserFindMany = vi.hoisted(() => vi.fn());
const mockRecompute = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({ db: { user: { findMany: mockUserFindMany } } }));
vi.mock('@/lib/trust-score', () => ({
  recomputeUserTrustScore: mockRecompute,
}));
import { GET } from '../route';
const req = (auth?: string) =>
  ({ headers: new Headers(auth ? { authorization: auth } : {}) }) as any;

describe('GET /api/cron/recompute-trust', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 's3cret';
    mockUserFindMany.mockResolvedValue([]);
  });
  it('rejects without the cron secret', async () => {
    expect((await GET(req())).status).toBe(401);
  });
  it('recomputes each active user with the secret', async () => {
    mockUserFindMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
    const res = await GET(req('Bearer s3cret'));
    expect(res.status).toBe(200);
    expect(mockRecompute).toHaveBeenCalledTimes(2);
    expect(mockRecompute).toHaveBeenCalledWith('u1');
  });
});

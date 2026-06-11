import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stateful fake Redis so the behavioral contract runs against the Redis path
const fakeStore = vi.hoisted(() => new Map<string, number>());
const fakeTtls = vi.hoisted(() => new Map<string, number>());
const mockIncr = vi.hoisted(() => vi.fn());
const mockExpire = vi.hoisted(() => vi.fn());
const mockDel = vi.hoisted(() => vi.fn());

let redisAvailable = true;

vi.mock('@/lib/redis', () => ({
  get redis() {
    return redisAvailable
      ? { incr: mockIncr, expire: mockExpire, del: mockDel }
      : null;
  },
}));

async function loadRateLimit() {
  vi.resetModules();
  const mod = await import('../rate-limit');
  return mod.rateLimit;
}

beforeEach(() => {
  fakeStore.clear();
  fakeTtls.clear();
  mockIncr.mockReset().mockImplementation(async (key: string) => {
    const next = (fakeStore.get(key) ?? 0) + 1;
    fakeStore.set(key, next);
    return next;
  });
  mockExpire.mockReset().mockImplementation(async (key: string, s: number) => {
    fakeTtls.set(key, s);
    return 1;
  });
  mockDel.mockReset().mockImplementation(async (key: string) => {
    fakeStore.delete(key);
    return 1;
  });
});

function behavioralContract(setup: () => void) {
  let limiter: {
    check: (limit: number, token: string) => Promise<void>;
    reset: (token: string) => Promise<void> | void;
  };

  beforeEach(async () => {
    setup();
    const rateLimit = await loadRateLimit();
    limiter = rateLimit({
      interval: 60000, // 1 minute
      uniqueTokenPerInterval: 100,
      name: 'test',
    });
  });

  it('should allow requests within limit', async () => {
    await expect(limiter.check(5, 'user1')).resolves.toBeUndefined();
    await expect(limiter.check(5, 'user1')).resolves.toBeUndefined();
    await expect(limiter.check(5, 'user1')).resolves.toBeUndefined();
  });

  it('should reject requests that exceed limit', async () => {
    for (let i = 0; i < 5; i++) {
      await expect(limiter.check(5, 'user1')).resolves.toBeUndefined();
    }
    await expect(limiter.check(5, 'user1')).rejects.toThrow();
    await expect(limiter.check(5, 'user1')).rejects.toThrow();
  });

  it('should track different tokens separately', async () => {
    for (let i = 0; i < 5; i++) {
      await expect(limiter.check(5, 'user1')).resolves.toBeUndefined();
    }
    await expect(limiter.check(5, 'user1')).rejects.toThrow();
    await expect(limiter.check(5, 'user2')).resolves.toBeUndefined();
    await expect(limiter.check(5, 'user2')).resolves.toBeUndefined();
  });

  it('should reset rate limit for specific token', async () => {
    for (let i = 0; i < 5; i++) {
      await expect(limiter.check(5, 'user1')).resolves.toBeUndefined();
    }
    await expect(limiter.check(5, 'user1')).rejects.toThrow();

    await limiter.reset('user1');

    await expect(limiter.check(5, 'user1')).resolves.toBeUndefined();
  });

  it('should not affect other tokens when resetting', async () => {
    await limiter.check(5, 'user1');
    await limiter.check(5, 'user1');
    await limiter.check(5, 'user2');
    await limiter.check(5, 'user2');
    await limiter.check(5, 'user2');

    await limiter.reset('user1');

    for (let i = 0; i < 5; i++) {
      await expect(limiter.check(5, 'user1')).resolves.toBeUndefined();
    }
    await expect(limiter.check(5, 'user2')).resolves.toBeUndefined();
    await expect(limiter.check(5, 'user2')).resolves.toBeUndefined();
    await expect(limiter.check(5, 'user2')).rejects.toThrow();
  });

  it('should handle different limits correctly', async () => {
    await expect(limiter.check(3, 'user1')).resolves.toBeUndefined();
    await expect(limiter.check(3, 'user1')).resolves.toBeUndefined();
    await expect(limiter.check(3, 'user1')).resolves.toBeUndefined();
    await expect(limiter.check(3, 'user1')).rejects.toThrow();

    await expect(limiter.check(1, 'user2')).resolves.toBeUndefined();
    await expect(limiter.check(1, 'user2')).rejects.toThrow();
  });

  it('should handle edge case of zero limit', async () => {
    await expect(limiter.check(0, 'user1')).rejects.toThrow();
  });
}

describe('Rate Limiting (Redis-backed)', () => {
  behavioralContract(() => {
    redisAvailable = true;
  });

  it('uses a namespaced Redis key per limiter and token', async () => {
    redisAvailable = true;
    const rateLimit = await loadRateLimit();
    const limiter = rateLimit({
      interval: 60000,
      uniqueTokenPerInterval: 100,
      name: 'send-code',
    });

    await limiter.check(5, 'a@b.com');

    expect(mockIncr).toHaveBeenCalledWith('ratelimit:send-code:a@b.com');
  });

  it('sets a TTL matching the interval on the first hit in a window', async () => {
    redisAvailable = true;
    const rateLimit = await loadRateLimit();
    const limiter = rateLimit({
      interval: 10 * 60 * 1000,
      uniqueTokenPerInterval: 100,
      name: 'send-code',
    });

    await limiter.check(5, 'a@b.com');

    expect(mockExpire).toHaveBeenCalledWith('ratelimit:send-code:a@b.com', 600);
  });

  it('deletes the Redis key on reset', async () => {
    redisAvailable = true;
    const rateLimit = await loadRateLimit();
    const limiter = rateLimit({
      interval: 60000,
      uniqueTokenPerInterval: 100,
      name: 'send-code',
    });

    await limiter.check(5, 'a@b.com');
    await limiter.reset('a@b.com');

    expect(mockDel).toHaveBeenCalledWith('ratelimit:send-code:a@b.com');
  });

  it('falls back to the in-memory limiter when Redis errors at runtime', async () => {
    redisAvailable = true;
    mockIncr.mockRejectedValue(new Error('redis down'));
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const rateLimit = await loadRateLimit();
    const limiter = rateLimit({
      interval: 60000,
      uniqueTokenPerInterval: 100,
      name: 'test',
    });

    // Still enforces the limit per-instance instead of throwing
    await expect(limiter.check(2, 'user1')).resolves.toBeUndefined();
    await expect(limiter.check(2, 'user1')).resolves.toBeUndefined();
    await expect(limiter.check(2, 'user1')).rejects.toThrow();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('Rate Limiting (in-memory fallback when Redis unconfigured)', () => {
  behavioralContract(() => {
    redisAvailable = false;
  });
});

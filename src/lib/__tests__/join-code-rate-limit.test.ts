import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stateful fake Redis, mirroring rate-limit.test.ts, so the limiter's real
// backing store is exercised rather than a stub of itself.
const fakeStore = vi.hoisted(() => new Map<string, number>());
const mockIncr = vi.hoisted(() => vi.fn());
const mockExpire = vi.hoisted(() => vi.fn());
const mockGet = vi.hoisted(() => vi.fn());
const mockDel = vi.hoisted(() => vi.fn());

vi.mock('@/lib/redis', () => ({
  get redis() {
    return { incr: mockIncr, expire: mockExpire, get: mockGet, del: mockDel };
  },
}));

async function loadModule() {
  vi.resetModules();
  return import('../join-code-rate-limit');
}

beforeEach(() => {
  fakeStore.clear();
  mockIncr.mockReset().mockImplementation(async (key: string) => {
    const next = (fakeStore.get(key) ?? 0) + 1;
    fakeStore.set(key, next);
    return next;
  });
  mockExpire.mockReset().mockResolvedValue(1);
  mockGet
    .mockReset()
    .mockImplementation(async (key: string) => fakeStore.get(key) ?? null);
  mockDel.mockReset().mockImplementation(async (key: string) => {
    fakeStore.delete(key);
    return 1;
  });
});

describe('join lookup failure limiter', () => {
  it('does not block a client that has recorded no failures', async () => {
    const { isJoinLookupBlocked } = await loadModule();
    expect(await isJoinLookupBlocked('1.2.3.4')).toBe(false);
  });

  it('does not block while failures stay inside the budget', async () => {
    const {
      isJoinLookupBlocked,
      recordJoinLookupFailure,
      JOIN_LOOKUP_FAILURE_LIMIT,
    } = await loadModule();

    for (let i = 0; i < JOIN_LOOKUP_FAILURE_LIMIT; i++) {
      await recordJoinLookupFailure('1.2.3.4');
      expect(await isJoinLookupBlocked('1.2.3.4')).toBe(false);
    }
  });

  it('blocks once the failure budget is exceeded', async () => {
    const {
      isJoinLookupBlocked,
      recordJoinLookupFailure,
      JOIN_LOOKUP_FAILURE_LIMIT,
    } = await loadModule();

    for (let i = 0; i <= JOIN_LOOKUP_FAILURE_LIMIT; i++) {
      await recordJoinLookupFailure('1.2.3.4');
    }
    expect(await isJoinLookupBlocked('1.2.3.4')).toBe(true);
  });

  it('tracks clients separately', async () => {
    const {
      isJoinLookupBlocked,
      recordJoinLookupFailure,
      JOIN_LOOKUP_FAILURE_LIMIT,
    } = await loadModule();

    for (let i = 0; i <= JOIN_LOOKUP_FAILURE_LIMIT; i++) {
      await recordJoinLookupFailure('1.2.3.4');
    }
    expect(await isJoinLookupBlocked('1.2.3.4')).toBe(true);
    expect(await isJoinLookupBlocked('5.6.7.8')).toBe(false);
  });

  // The whole design rests on this: the check runs on EVERY request, before
  // any lookup. If checking also counted, a member opening a valid flyer link
  // twenty times would lock themselves out of a code that works.
  it('checking does not itself count against the budget', async () => {
    const { isJoinLookupBlocked, JOIN_LOOKUP_FAILURE_LIMIT } =
      await loadModule();

    for (let i = 0; i < JOIN_LOOKUP_FAILURE_LIMIT * 3; i++) {
      expect(await isJoinLookupBlocked('1.2.3.4')).toBe(false);
    }
    expect(mockIncr).not.toHaveBeenCalled();
  });
});

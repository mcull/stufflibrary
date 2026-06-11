import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockIncrby = vi.hoisted(() => vi.fn());
const mockExpire = vi.hoisted(() => vi.fn());
const mockGet = vi.hoisted(() => vi.fn());

let redisAvailable = true;

vi.mock('@/lib/redis', () => ({
  get redis() {
    return redisAvailable
      ? { incrby: mockIncrby, expire: mockExpire, get: mockGet }
      : null;
  },
}));

async function loadModule() {
  vi.resetModules();
  return import('../spend-cap');
}

describe('spend-cap', () => {
  beforeEach(() => {
    redisAvailable = true;
    mockIncrby.mockReset();
    mockExpire.mockReset().mockResolvedValue(1);
    mockGet.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-10T12:00:00Z'));
    delete process.env.DAILY_SPEND_CAP_CENTS;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkSpendCap', () => {
    it('allows the call when spend is under the cap', async () => {
      mockGet.mockResolvedValue('500');
      process.env.DAILY_SPEND_CAP_CENTS = '1000';
      const { checkSpendCap } = await loadModule();

      const result = await checkSpendCap('openai');

      expect(result.allowed).toBe(true);
    });

    it('blocks the call when spend has reached the cap', async () => {
      mockGet.mockResolvedValue('1000');
      process.env.DAILY_SPEND_CAP_CENTS = '1000';
      const { checkSpendCap } = await loadModule();

      const result = await checkSpendCap('openai');

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/daily/i);
    });

    it('reads spend from a UTC-dated global key', async () => {
      mockGet.mockResolvedValue(null);
      const { checkSpendCap } = await loadModule();

      await checkSpendCap('places');

      expect(mockGet).toHaveBeenCalledWith('spend:2026-06-10:global');
    });

    it('treats a missing counter as zero spend', async () => {
      mockGet.mockResolvedValue(null);
      process.env.DAILY_SPEND_CAP_CENTS = '1';
      const { checkSpendCap } = await loadModule();

      const result = await checkSpendCap('gemini');

      expect(result.allowed).toBe(true);
    });

    it('fails open with a warning when Redis is not configured', async () => {
      redisAvailable = false;
      const errorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const { checkSpendCap } = await loadModule();

      const result = await checkSpendCap('openai');

      expect(result.allowed).toBe(true);
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('fails open when Redis errors at runtime', async () => {
      mockGet.mockRejectedValue(new Error('redis down'));
      const errorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const { checkSpendCap } = await loadModule();

      const result = await checkSpendCap('openai');

      expect(result.allowed).toBe(true);
      errorSpy.mockRestore();
    });
  });

  describe('recordSpend', () => {
    it('increments global and per-provider counters with a TTL', async () => {
      mockIncrby.mockResolvedValue(42);
      const { recordSpend } = await loadModule();

      await recordSpend('openai', 7);

      expect(mockIncrby).toHaveBeenCalledWith('spend:2026-06-10:global', 7);
      expect(mockIncrby).toHaveBeenCalledWith('spend:2026-06-10:openai', 7);
      expect(mockExpire).toHaveBeenCalledWith(
        'spend:2026-06-10:global',
        60 * 60 * 48
      );
    });

    it('records at least 1 cent for any paid call', async () => {
      mockIncrby.mockResolvedValue(1);
      const { recordSpend } = await loadModule();

      await recordSpend('places', 0);

      expect(mockIncrby).toHaveBeenCalledWith('spend:2026-06-10:global', 1);
    });

    it('does not throw when Redis is unavailable', async () => {
      redisAvailable = false;
      const errorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const { recordSpend } = await loadModule();

      await expect(recordSpend('gemini', 5)).resolves.toBeUndefined();
      errorSpy.mockRestore();
    });

    it('does not throw when Redis errors at runtime', async () => {
      mockIncrby.mockRejectedValue(new Error('redis down'));
      const errorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const { recordSpend } = await loadModule();

      await expect(recordSpend('openai', 5)).resolves.toBeUndefined();
      errorSpy.mockRestore();
    });
  });

  describe('withGeminiSpendCap', () => {
    it('throws SpendCapExceededError without invoking the call when capped', async () => {
      mockGet.mockResolvedValue('1000');
      const { withGeminiSpendCap, SpendCapExceededError } = await loadModule();
      const call = vi.fn();

      await expect(
        withGeminiSpendCap('gemini-2.5-flash', call)
      ).rejects.toBeInstanceOf(SpendCapExceededError);
      expect(call).not.toHaveBeenCalled();
    });

    it('invokes the call and records gemini spend when under the cap', async () => {
      mockGet.mockResolvedValue('0');
      mockIncrby.mockResolvedValue(1);
      const { withGeminiSpendCap } = await loadModule();
      const call = vi.fn().mockResolvedValue('result');

      const result = await withGeminiSpendCap('gemini-2.5-flash', call);

      expect(result).toBe('result');
      expect(mockIncrby).toHaveBeenCalledWith('spend:2026-06-10:gemini', 1);
    });

    it('records a higher flat estimate for image-generation models', async () => {
      mockGet.mockResolvedValue('0');
      mockIncrby.mockResolvedValue(4);
      const { withGeminiSpendCap } = await loadModule();

      await withGeminiSpendCap(
        'gemini-2.5-flash-image-preview',
        async () => 'ok'
      );

      expect(mockIncrby).toHaveBeenCalledWith('spend:2026-06-10:gemini', 4);
    });

    it('does not record spend when the call itself fails', async () => {
      mockGet.mockResolvedValue('0');
      const { withGeminiSpendCap } = await loadModule();

      await expect(
        withGeminiSpendCap('gemini-2.5-flash', async () => {
          throw new Error('gemini down');
        })
      ).rejects.toThrow('gemini down');
      expect(mockIncrby).not.toHaveBeenCalled();
    });
  });

  describe('cap configuration', () => {
    it('defaults the daily cap to 1000 cents when env is unset', async () => {
      mockGet.mockResolvedValue('999');
      const { checkSpendCap } = await loadModule();

      const under = await checkSpendCap('openai');
      expect(under.allowed).toBe(true);

      mockGet.mockResolvedValue('1000');
      const over = await checkSpendCap('openai');
      expect(over.allowed).toBe(false);
    });

    it('honors DAILY_SPEND_CAP_CENTS from the environment', async () => {
      process.env.DAILY_SPEND_CAP_CENTS = '50';
      mockGet.mockResolvedValue('50');
      const { checkSpendCap } = await loadModule();

      const result = await checkSpendCap('openai');

      expect(result.allowed).toBe(false);
    });
  });
});

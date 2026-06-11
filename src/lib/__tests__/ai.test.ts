import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockCheckSpendCap = vi.hoisted(() => vi.fn());
const mockRecordSpend = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());
const mockRecordAiUsage = vi.hoisted(() => vi.fn());
const mockLimiterCheck = vi.hoisted(() => vi.fn());

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({
    check: mockLimiterCheck,
    reset: vi.fn(),
  })),
}));

vi.mock('@/lib/spend-cap', () => ({
  checkSpendCap: mockCheckSpendCap,
  recordSpend: mockRecordSpend,
}));

vi.mock('@/lib/ai-usage', () => ({
  recordAiUsage: mockRecordAiUsage,
}));

vi.mock('@/lib/env', () => ({
  env: { OPENAI_API_KEY: 'test-key' },
}));

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));

describe('AIService.generateBorrowScript', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckSpendCap.mockResolvedValue({ allowed: true });
    mockRecordSpend.mockResolvedValue(undefined);
    mockRecordAiUsage.mockResolvedValue(undefined);
    mockLimiterCheck.mockResolvedValue(undefined);
  });

  it('fails without calling OpenAI when the shared rate limiter rejects', async () => {
    mockLimiterCheck.mockRejectedValue(new Error('Rate limit exceeded'));
    const { AIService } = await import('../ai');

    const result = await AIService.generateBorrowScript({
      itemName: 'ladder',
      identifier: 'user_1',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/rate limit/i);
    expect(mockLimiterCheck).toHaveBeenCalledWith(60, 'user_1');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('fails without calling OpenAI when the daily spend cap is reached', async () => {
    mockCheckSpendCap.mockResolvedValue({
      allowed: false,
      reason: 'Daily spend cap reached.',
    });
    const { AIService } = await import('../ai');

    const result = await AIService.generateBorrowScript({
      itemName: 'ladder',
      identifier: 'user_1',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/spend cap/i);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('generates a script and records spend when under the cap', async () => {
    mockCreate.mockResolvedValue({
      id: 'req_1',
      choices: [{ message: { content: 'Hey there, can I borrow it?' } }],
      usage: { prompt_tokens: 100, completion_tokens: 40 },
    });
    const { AIService } = await import('../ai');

    const result = await AIService.generateBorrowScript({
      itemName: 'ladder',
      identifier: 'user_1',
    });

    expect(result.success).toBe(true);
    expect(mockCheckSpendCap).toHaveBeenCalledWith('openai');
    expect(mockRecordSpend).toHaveBeenCalledWith('openai', expect.any(Number));
  });
});

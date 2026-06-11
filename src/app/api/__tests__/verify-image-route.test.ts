import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockCheckSpendCap = vi.hoisted(() => vi.fn());
const mockRecordSpend = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/spend-cap', () => ({
  checkSpendCap: mockCheckSpendCap,
  recordSpend: mockRecordSpend,
}));

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));

function makeRequest() {
  const file = {
    arrayBuffer: async () => new ArrayBuffer(8),
    type: 'image/png',
  };
  return {
    formData: vi.fn().mockResolvedValue(new Map([['image', file]])),
    headers: new Headers(),
  } as any;
}

describe('POST /api/verify-image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
    mockGetServerSession.mockResolvedValue({ user: { id: 'user_1' } });
    mockCheckSpendCap.mockResolvedValue({ allowed: true });
    mockRecordSpend.mockResolvedValue(undefined);
  });

  it('returns 401 when unauthenticated and does not call OpenAI', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const { POST } = await import('../verify-image/route');

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 429 when the daily spend cap is reached, before calling OpenAI', async () => {
    mockCheckSpendCap.mockResolvedValue({
      allowed: false,
      reason: 'Daily spend cap reached.',
    });
    const { POST } = await import('../verify-image/route');

    const response = await POST(makeRequest());

    expect(response.status).toBe(429);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('analyzes the image and records spend when authenticated and under cap', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: '{"approved": true, "reason": "", "confidence": "high"}',
          },
        },
      ],
      usage: { prompt_tokens: 1000, completion_tokens: 50 },
    });
    const { POST } = await import('../verify-image/route');

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.approved).toBe(true);
    expect(mockCheckSpendCap).toHaveBeenCalledWith('openai');
    expect(mockRecordSpend).toHaveBeenCalledWith('openai', expect.any(Number));
  });
});

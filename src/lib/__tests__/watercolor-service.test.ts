import { describe, it, expect, vi, beforeEach } from 'vitest';

import { WatercolorService } from '../watercolor-service';

// Route a mocked generateContent by which pipeline step is calling: the
// person-detection prompt vs the watercolor-generation prompt. Keeps tests
// deterministic even though the two calls now run in parallel.
function splitGenerateContent(handlers: {
  detect: () => Promise<unknown> | unknown;
  generate: () => Promise<unknown> | unknown;
}) {
  return vi.fn().mockImplementation((req: any) => {
    const text: string = req?.contents?.[0]?.text ?? '';
    return text.includes('determine if it contains any people')
      ? Promise.resolve(handlers.detect())
      : Promise.resolve(handlers.generate());
  });
}

const IMAGE_RESPONSE = {
  candidates: [
    { content: { parts: [{ inlineData: { data: 'mock-base64-image' } }] } },
  ],
};
const detectResponse = (answer: string) => ({
  candidates: [{ content: { parts: [{ text: answer }] } }],
});

// Pass-through mock so tests never hit the real Redis-backed spend cap
vi.mock('../spend-cap', () => ({
  withGeminiSpendCap: vi.fn((_model: string, call: () => Promise<unknown>) =>
    call()
  ),
  checkSpendCap: vi.fn().mockResolvedValue({ allowed: true }),
  recordSpend: vi.fn().mockResolvedValue(undefined),
}));

// Mock the dependencies
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn().mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'false',
                  inlineData: {
                    data: 'mock-base64-image-data',
                  },
                },
              ],
            },
          },
        ],
        text: 'false',
        data: null,
        functionCalls: null,
        executableCode: null,
        codeExecutionResult: null,
      }),
    },
  })),
}));

vi.mock('@vercel/blob', () => ({
  put: vi.fn().mockResolvedValue({
    url: 'https://example.com/mock-image.webp',
  }),
}));

vi.mock('sharp', () => ({
  default: vi.fn().mockImplementation(() => ({
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('mock-processed-image')),
  })),
}));

describe('WatercolorService', () => {
  let service: WatercolorService;
  const mockImageBuffer = Buffer.from('mock-image-data');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('GOOGLE_AI_API_KEY', 'test-api-key');
    service = new WatercolorService();
  });

  describe('constructor', () => {
    it('should initialize with valid API key', () => {
      expect(() => new WatercolorService()).not.toThrow();
    });

    it('should throw error without API key', () => {
      vi.stubEnv('GOOGLE_AI_API_KEY', '');
      expect(() => new WatercolorService()).toThrow(
        'GOOGLE_AI_API_KEY environment variable is required'
      );
    });
  });

  describe('renderWatercolor', () => {
    const mockOptions = {
      itemId: 'test-item-id',
      originalImageBuffer: mockImageBuffer,
      originalImageName: 'test-image.jpg',
      mimeType: 'image/jpeg',
    };

    it('should successfully render watercolor for safe images', async () => {
      const result = await service.renderWatercolor(mockOptions);

      expect(result).toMatchObject({
        watercolorUrl: expect.stringContaining('https://'),
        watercolorThumbUrl: expect.stringContaining('https://'),
        styleVersion: 'wc_v1',
        aiModel: 'gemini-2.5-flash-image',
        synthIdWatermark: false,
        flags: [],
        idempotencyKey: expect.stringMatching(/^[a-f0-9]{64}$/),
      });
    });

    it('does not re-upload the original image (#408 — create-draft already stored it)', async () => {
      const { put } = await import('@vercel/blob');
      const mockPut = vi.mocked(put);
      mockPut.mockClear();

      const result = await service.renderWatercolor(mockOptions);

      const paths = mockPut.mock.calls.map((c) => String(c[0]));
      expect(paths.some((p) => p.includes('/original/'))).toBe(false);
      // The square render still uploads.
      expect(paths.some((p) => p.includes('/renders/'))).toBe(true);
      expect(result.originalUrl).toBeUndefined();
    });

    it('stores the original when asked (concept flow has no prior upload)', async () => {
      const { put } = await import('@vercel/blob');
      const mockPut = vi.mocked(put);
      mockPut.mockClear();

      const result = await service.renderWatercolor({
        ...mockOptions,
        storeOriginal: true,
      });

      const paths = mockPut.mock.calls.map((c) => String(c[0]));
      expect(paths.some((p) => p.includes('/original/'))).toBe(true);
      expect(result.originalUrl).toContain('https://');
    });

    it('always instructs full de-identification, so generation never waits on detection (#408)', async () => {
      const mockGenerateContent = splitGenerateContent({
        detect: () => detectResponse('false'),
        generate: () => IMAGE_RESPONSE,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).genAI = {
        models: { generateContent: mockGenerateContent },
      };

      await service.renderWatercolor(mockOptions);

      const watercolorCall = mockGenerateContent.mock.calls.find((c: any) =>
        String(c[0]?.contents?.[0]?.text ?? '').includes(
          'production image editor'
        )
      );
      expect(watercolorCall).toBeDefined();
      expect(String((watercolorCall as any)[0].contents[0].text)).toContain(
        'MUST completely remove all people'
      );
    });

    it('should handle images with people detected', async () => {
      const testService = new WatercolorService();
      const mockGenerateContent = splitGenerateContent({
        detect: () => detectResponse('true'),
        generate: () => IMAGE_RESPONSE,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (testService as any).genAI = {
        models: { generateContent: mockGenerateContent },
      };

      const result = await testService.renderWatercolor(mockOptions);

      expect(result.flags).toContain('person_detected');
      expect(result.watercolorUrl).toBeDefined();
      expect(result.watercolorThumbUrl).toBeDefined();
    });

    it('should generate consistent idempotency keys', async () => {
      const result1 = await service.renderWatercolor(mockOptions);
      const result2 = await service.renderWatercolor(mockOptions);

      expect(result1.idempotencyKey).toBe(result2.idempotencyKey);
    });

    it('should handle different image formats', async () => {
      const pngOptions = {
        ...mockOptions,
        originalImageName: 'test-image.png',
        mimeType: 'image/png',
      };

      const result = await service.renderWatercolor(pngOptions);
      expect(result.watercolorUrl).toBeDefined();
    });

    it('a person-detection failure stays non-fatal (conservative flag, watercolor still renders)', async () => {
      const testService = new WatercolorService();
      const mockGenerateContent = splitGenerateContent({
        detect: () => Promise.reject(new Error('API Error')),
        generate: () => IMAGE_RESPONSE,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (testService as any).genAI = {
        models: { generateContent: mockGenerateContent },
      };

      const result = await testService.renderWatercolor(mockOptions);

      expect(result.flags).toContain('person_detected');
      expect(result.watercolorUrl).toBeDefined();
    });

    it('an image-generation failure rejects with a clear error', async () => {
      const testService = new WatercolorService();
      const mockGenerateContent = vi
        .fn()
        .mockRejectedValue(new Error('API Error'));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (testService as any).genAI = {
        models: { generateContent: mockGenerateContent },
      };

      await expect(testService.renderWatercolor(mockOptions)).rejects.toThrow(
        'Watercolor rendering failed'
      );
    });
  });

  describe('storage paths', () => {
    it('should generate correct storage paths', async () => {
      const { put } = await import('@vercel/blob');
      const mockPut = vi.mocked(put);

      await service.renderWatercolor({
        itemId: 'test-item',
        originalImageBuffer: mockImageBuffer,
        originalImageName: 'image.jpg',
        mimeType: 'image/jpeg',
      });

      // Check that storage paths are correctly formatted
      const calls = mockPut.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      // Basic check that paths contain expected patterns
      const pathStrings = calls.map((call) => String(call[0])); // First argument is the path in Vercel Blob API
      expect(pathStrings.some((path) => path.includes('test-item'))).toBe(true);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { WatercolorService } from '../watercolor-service';

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
        originalUrl: expect.stringContaining('https://'),
        watercolorUrl: expect.stringContaining('https://'),
        watercolorThumbUrl: expect.stringContaining('https://'),
        styleVersion: 'wc_v1',
        aiModel: 'gemini-2.5-flash-image-preview',
        synthIdWatermark: false,
        flags: [],
        idempotencyKey: expect.stringMatching(/^[a-f0-9]{64}$/),
      });
    });

    it('should handle images with people detected', async () => {
      // Create a new service instance and override the detectPersonsInImage method behavior
      const testService = new WatercolorService();

      // Mock the generateContent to return 'true' for person detection (first call)
      const mockGenerateContent = vi.fn().mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'true', // Person detected
                },
              ],
            },
          },
        ],
        text: 'true',
        data: null,
        functionCalls: null,
        executableCode: null,
        codeExecutionResult: null,
      });

      // Override the genAI models property
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (testService as any).genAI = {
        models: {
          generateContent: mockGenerateContent,
        },
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
      expect(result.originalUrl).toBeDefined();
      expect(result.watercolorUrl).toBeDefined();
    });

    it('should handle API errors gracefully', async () => {
      // Create a new service instance with error-throwing mock
      const testService = new WatercolorService();

      const mockGenerateContent = vi
        .fn()
        .mockRejectedValue(new Error('API Error'));

      // Override the genAI models property
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (testService as any).genAI = {
        models: {
          generateContent: mockGenerateContent,
        },
      };

      // The service should gracefully degrade to safe processing when person detection fails
      const result = await testService.renderWatercolor(mockOptions);

      // Should flag as person detected (conservative approach) and still process the image
      expect(result.flags).toContain('person_detected');
      expect(result.watercolorUrl).toBeDefined();
      expect(result.watercolorThumbUrl).toBeDefined();
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

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { WatercolorService } from '../watercolor-service';

// Mock the dependencies
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: vi.fn().mockReturnValue('false'),
        },
      }),
    }),
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
        aiModel: 'gemini-2.5-flash-image',
        synthIdWatermark: false,
        flags: [],
        idempotencyKey: expect.stringMatching(/^[a-f0-9]{64}$/),
      });
    });

    it('should handle images with people detected', async () => {
      // Mock person detection to return true
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const mockGenAI = new GoogleGenerativeAI('test');
      const mockModel = mockGenAI.getGenerativeModel({ model: 'test' });

      vi.mocked(mockModel.generateContent).mockResolvedValueOnce({
        response: {
          text: vi.fn().mockReturnValue('true'), // Person detected
        },
      } as any);

      const result = await service.renderWatercolor(mockOptions);

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
      // Mock API error
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const mockGenAI = new GoogleGenerativeAI('test');
      const mockModel = mockGenAI.getGenerativeModel({ model: 'test' });

      vi.mocked(mockModel.generateContent).mockRejectedValueOnce(
        new Error('API Error')
      );

      await expect(service.renderWatercolor(mockOptions)).rejects.toThrow(
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
      const pathStrings = calls.map((call) => String(call[1]));
      expect(pathStrings.some((path) => path.includes('test-item'))).toBe(true);
    });
  });
});

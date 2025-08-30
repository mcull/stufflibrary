// Trust safety tests - temporarily disabled until schema is updated
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the db module
vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { TrustSafetyService } from '../trust-safety';

describe('TrustSafetyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getInstance', () => {
    it('returns singleton instance', () => {
      const instance1 = TrustSafetyService.getInstance();
      const instance2 = TrustSafetyService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('calculateTrustScore', () => {
    it('returns default score until schema is implemented', async () => {
      const service = TrustSafetyService.getInstance();
      const score = await service.calculateTrustScore('user-123');
      expect(score).toBe(100);
    });
  });

  describe('runAutomatedFlagging', () => {
    it('is disabled until schema is implemented', async () => {
      const service = TrustSafetyService.getInstance();
      await expect(service.runAutomatedFlagging()).resolves.toBeUndefined();
    });
  });

  describe('getRules', () => {
    it('returns empty rules until schema is implemented', () => {
      const service = TrustSafetyService.getInstance();
      const rules = service.getRules();
      expect(rules).toEqual([]);
    });
  });

  describe('createReport', () => {
    it('returns null until schema is implemented', async () => {
      const service = TrustSafetyService.getInstance();
      const result = await service.createReport(
        'reporter-123',
        'reported-456',
        'SPAM'
      );
      expect(result).toBeNull();
    });
  });
});

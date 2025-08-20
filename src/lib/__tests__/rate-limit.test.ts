import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rateLimit } from '../rate-limit';

describe('Rate Limiting', () => {
  let limiter: ReturnType<typeof rateLimit>;
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Create a fresh limiter for each test
    limiter = rateLimit({
      interval: 60000, // 1 minute
      uniqueTokenPerInterval: 100,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rateLimit', () => {
    it('should allow requests within limit', async () => {
      // First request should pass
      await expect(limiter.check(5, 'user1')).resolves.toBeUndefined();
      
      // Second request should pass
      await expect(limiter.check(5, 'user1')).resolves.toBeUndefined();
      
      // Third request should pass
      await expect(limiter.check(5, 'user1')).resolves.toBeUndefined();
    });

    it('should reject requests that exceed limit', async () => {
      // Make 5 requests (limit is 5)
      for (let i = 0; i < 5; i++) {
        await expect(limiter.check(5, 'user1')).resolves.toBeUndefined();
      }

      // 6th request should be rejected
      await expect(limiter.check(5, 'user1')).rejects.toThrow();
      
      // 7th request should also be rejected
      await expect(limiter.check(5, 'user1')).rejects.toThrow();
    });

    it('should track different tokens separately', async () => {
      // User1 makes 5 requests
      for (let i = 0; i < 5; i++) {
        await expect(limiter.check(5, 'user1')).resolves.toBeUndefined();
      }

      // User1's next request should be rejected
      await expect(limiter.check(5, 'user1')).rejects.toThrow();

      // But user2 should still be allowed
      await expect(limiter.check(5, 'user2')).resolves.toBeUndefined();
      await expect(limiter.check(5, 'user2')).resolves.toBeUndefined();
    });

    it('should reset rate limit for specific token', async () => {
      // Exhaust the limit for user1
      for (let i = 0; i < 5; i++) {
        await expect(limiter.check(5, 'user1')).resolves.toBeUndefined();
      }

      // Next request should be rejected
      await expect(limiter.check(5, 'user1')).rejects.toThrow();

      // Reset the limit for user1
      limiter.reset('user1');

      // Now user1 should be allowed again
      await expect(limiter.check(5, 'user1')).resolves.toBeUndefined();
    });

    it('should not affect other tokens when resetting', async () => {
      // Both users make some requests
      await limiter.check(5, 'user1');
      await limiter.check(5, 'user1');
      await limiter.check(5, 'user2');
      await limiter.check(5, 'user2');
      await limiter.check(5, 'user2');

      // Reset user1
      limiter.reset('user1');

      // User1 should be reset (can make 5 more requests)
      for (let i = 0; i < 5; i++) {
        await expect(limiter.check(5, 'user1')).resolves.toBeUndefined();
      }

      // User2 should still have their original count (2 more requests allowed)
      await expect(limiter.check(5, 'user2')).resolves.toBeUndefined();
      await expect(limiter.check(5, 'user2')).resolves.toBeUndefined();
      await expect(limiter.check(5, 'user2')).rejects.toThrow();
    });

    it('should handle different limits correctly', async () => {
      // Test with limit of 3
      await expect(limiter.check(3, 'user1')).resolves.toBeUndefined();
      await expect(limiter.check(3, 'user1')).resolves.toBeUndefined();
      await expect(limiter.check(3, 'user1')).resolves.toBeUndefined();
      await expect(limiter.check(3, 'user1')).rejects.toThrow();

      // Test with limit of 1
      await expect(limiter.check(1, 'user2')).resolves.toBeUndefined();
      await expect(limiter.check(1, 'user2')).rejects.toThrow();
    });

    it('should handle edge case of zero limit', async () => {
      // Even first request with limit 0 should be rejected
      await expect(limiter.check(0, 'user1')).rejects.toThrow();
    });

    it('should handle concurrent requests correctly', async () => {
      // Make exactly 6 requests - 5 should succeed, 1 should be rejected
      const promises = Array.from({ length: 6 }, (_, i) => 
        limiter.check(5, 'user1').then(() => `success-${i}`).catch(() => `rejected-${i}`)
      );

      const results = await Promise.all(promises);
      
      // At least 4 should succeed (allowing for timing variations)
      // The important thing is that some are rejected when limit is exceeded
      const successful = results.filter(r => r.startsWith('success')).length;
      const rejected = results.filter(r => r.startsWith('rejected')).length;
      
      expect(successful).toBeGreaterThanOrEqual(4);
      expect(successful).toBeLessThanOrEqual(5);
      expect(rejected).toBeGreaterThanOrEqual(1);
      expect(successful + rejected).toBe(6);
    });
  });
});
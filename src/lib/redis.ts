import { Redis } from '@upstash/redis';

import { env } from './env';

// Initialize Redis client with Upstash (only if credentials are available)
export const redis =
  env.KV_REST_API_URL && env.KV_REST_API_TOKEN
    ? new Redis({
        url: env.KV_REST_API_URL,
        token: env.KV_REST_API_TOKEN,
      })
    : null;

// Read-only Redis client for read operations
export const redisReadOnly =
  env.KV_REST_API_URL && env.KV_REST_API_READ_ONLY_TOKEN
    ? new Redis({
        url: env.KV_REST_API_URL,
        token: env.KV_REST_API_READ_ONLY_TOKEN,
      })
    : null;

// Redis utility functions
export class RedisService {
  static async testConnection(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      if (!redis) {
        return {
          success: false,
          message:
            'Redis client not initialized - missing environment variables',
        };
      }

      const testKey = 'health-check';
      const testValue = 'test-value-' + Date.now();

      // Test write operation - store as plain string, not JSON
      await redis.set(testKey, testValue, { ex: 60 }); // Expire in 60 seconds

      // Test read operation
      const result = await redis.get(testKey);

      if (result === testValue) {
        // Clean up
        await redis.del(testKey);
        return { success: true, message: 'Redis connection successful' };
      } else {
        return {
          success: false,
          message: `Redis read/write test failed - expected: ${testValue}, got: ${result} (type: ${typeof result})`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  static async set(
    key: string,
    value: string | number | object,
    options?: { ex?: number }
  ): Promise<void> {
    if (!redis) {
      throw new Error('Redis client not initialized');
    }

    try {
      if (options?.ex) {
        await redis.set(key, JSON.stringify(value), { ex: options.ex });
      } else {
        await redis.set(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error('Redis SET error:', error);
      throw error;
    }
  }

  static async get<T>(key: string): Promise<T | null> {
    if (!redis) {
      throw new Error('Redis client not initialized');
    }

    try {
      const result = await redis.get(key);
      if (result === null || result === undefined) return null;
      return typeof result === 'string' ? JSON.parse(result) : (result as T);
    } catch (error) {
      console.error('Redis GET error:', error);
      throw error;
    }
  }

  static async del(key: string): Promise<number> {
    if (!redis) {
      throw new Error('Redis client not initialized');
    }

    try {
      return await redis.del(key);
    } catch (error) {
      console.error('Redis DEL error:', error);
      throw error;
    }
  }

  static async exists(key: string): Promise<number> {
    if (!redis) {
      throw new Error('Redis client not initialized');
    }

    try {
      return await redis.exists(key);
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      throw error;
    }
  }

  static async expire(key: string, seconds: number): Promise<number> {
    if (!redis) {
      throw new Error('Redis client not initialized');
    }

    try {
      return await redis.expire(key, seconds);
    } catch (error) {
      console.error('Redis EXPIRE error:', error);
      throw error;
    }
  }

  static async incr(key: string): Promise<number> {
    if (!redis) {
      throw new Error('Redis client not initialized');
    }

    try {
      return await redis.incr(key);
    } catch (error) {
      console.error('Redis INCR error:', error);
      throw error;
    }
  }
}

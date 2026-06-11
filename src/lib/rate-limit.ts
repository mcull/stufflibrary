import { LRUCache } from 'lru-cache';

import { redis } from '@/lib/redis';

type Options = {
  interval: number;
  uniqueTokenPerInterval: number;
  /** Namespace for Redis keys so different limiters don't collide. */
  name?: string;
};

/**
 * Fixed-window rate limiter backed by Redis (INCR + EXPIRE) so limits hold
 * across serverless instances. Falls back to the previous per-instance
 * in-memory LRU behavior when Redis is unconfigured or errors at runtime —
 * degraded protection beats failing the request.
 */
export function rateLimit(options: Options) {
  const name = options.name ?? 'default';
  const ttlSeconds = Math.max(1, Math.ceil(options.interval / 1000));

  const tokenCache = new LRUCache<string, number>({
    max: options.uniqueTokenPerInterval,
    ttl: options.interval,
  });

  const redisKey = (token: string) => `ratelimit:${name}:${token}`;

  const checkInMemory = (limit: number, token: string) => {
    const newCount = (tokenCache.get(token) || 0) + 1;
    tokenCache.set(token, newCount);
    if (newCount > limit) {
      throw new Error('Rate limit exceeded');
    }
  };

  return {
    check: async (limit: number, token: string): Promise<void> => {
      if (redis) {
        try {
          const count = await redis.incr(redisKey(token));
          if (count === 1) {
            await redis.expire(redisKey(token), ttlSeconds);
          }
          if (count > limit) {
            throw new Error('Rate limit exceeded');
          }
          return;
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === 'Rate limit exceeded'
          ) {
            throw error;
          }
          console.error(
            `Rate limiter '${name}' Redis error; falling back to in-memory:`,
            error
          );
        }
      } else {
        console.error(
          `Rate limiter '${name}': Redis not configured; using per-instance in-memory limits.`
        );
      }

      checkInMemory(limit, token);
    },
    reset: async (token: string): Promise<void> => {
      tokenCache.delete(token);
      if (redis) {
        try {
          await redis.del(redisKey(token));
        } catch (error) {
          console.error(`Rate limiter '${name}' Redis reset failed:`, error);
        }
      }
    },
  };
}

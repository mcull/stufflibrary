import { LRUCache } from 'lru-cache';

type Options = {
  interval: number;
  uniqueTokenPerInterval: number;
};

export function rateLimit(options: Options) {
  const tokenCache = new LRUCache({
    max: options.uniqueTokenPerInterval,
    ttl: options.interval,
  });

  return {
    check: (limit: number, token: string) =>
      new Promise<void>((resolve, reject) => {
        const currentCount = (tokenCache.get(token) as number) || 0;
        const newCount = currentCount + 1;
        
        tokenCache.set(token, newCount);

        if (newCount > limit) {
          reject();
        } else {
          resolve();
        }
      }),
    reset: (token: string) => {
      // Clear the rate limit for a specific token
      tokenCache.delete(token);
    },
  };
}
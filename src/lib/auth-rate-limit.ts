import { rateLimit } from './rate-limit';

// Rate limiting: 5 attempts per email per 10 minutes
export const sendCodeLimiter = rateLimit({
  interval: 10 * 60 * 1000, // 10 minutes
  uniqueTokenPerInterval: 100,
});
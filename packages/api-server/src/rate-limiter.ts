import type { FastifyRequest, FastifyReply } from 'fastify';
import { createLogger } from '@ideia/logger';
const logger = createLogger('rate-limiter');

export interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export type RateLimiterMiddleware = ((request: FastifyRequest, reply: FastifyReply) => Promise<void>) & {
  close(): void;
};

export function createRateLimiter(config: RateLimiterConfig): RateLimiterMiddleware {
  const { maxRequests, windowMs } = config;
  const buckets = new Map<string, Bucket>();

  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now - bucket.lastRefill > windowMs * 2) {
        buckets.delete(key);
      }
    }
  }, 60000);
  cleanupTimer.unref();

  const middleware = Object.assign(
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ip = request.ip;
      const now = Date.now();
      let bucket = buckets.get(ip);

      if (!bucket) {
        bucket = { tokens: maxRequests, lastRefill: now };
        buckets.set(ip, bucket);
      }

      const elapsed = now - bucket.lastRefill;
      const refillTokens = Math.min(maxRequests, (elapsed / windowMs) * maxRequests);
      bucket.tokens = Math.min(maxRequests, bucket.tokens + refillTokens);
      bucket.lastRefill = now;

      if (bucket.tokens < 1) {
        return reply.status(429).send({
          success: false,
          error: 'Too many requests',
          retryAfter: Math.ceil((windowMs - (Date.now() - bucket.lastRefill)) / 1000),
        });
      }

      bucket.tokens -= 1;
    },
    { close: () => { clearInterval(cleanupTimer); buckets.clear(); } }
  ) as RateLimiterMiddleware;

  return middleware;
}

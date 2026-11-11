// File: packages/server/src/middleware/rate-limit.ts
// Redis/In-Memory sliding-window rate limiter middleware for sensitive endpoints

import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/db';
import { RedisKeys } from '../utils/redis-keys';

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  endpoint: string;
  message?: string;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, max, endpoint, message = 'Too many requests. Please try again later.' } = options;
  const windowSec = Math.ceil(windowMs / 1000);

  return async function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
      const forwarded = req.headers['x-forwarded-for'];
      const clientIp = typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : req.ip || req.socket.remoteAddress || '127.0.0.1';

      const key = RedisKeys.rateLimit(clientIp, endpoint);
      const current = await redis.get(key);

      if (current !== null) {
        const count = parseInt(current, 10);
        if (count >= max) {
          res.setHeader('Retry-After', windowSec);
          res.setHeader('X-RateLimit-Limit', max);
          res.setHeader('X-RateLimit-Remaining', 0);
          return res.status(429).json({
            error: {
              code: 'TOO_MANY_REQUESTS',
              message,
            },
          });
        }
        await redis.set(key, String(count + 1));
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, max - (count + 1)));
      } else {
        await redis.set(key, '1');
        await redis.expire(key, windowSec);
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', max - 1);
      }

      next();
    } catch (err) {
      // In fail-open mode for rate limiting errors, allow request to proceed to avoid breaking users
      console.warn('⚠️ Rate limiter cache warning:', (err as any)?.message);
      next();
    }
  };
}

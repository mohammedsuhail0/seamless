// Agent: 🖥️ Agent B (Server)
// File: packages/server/src/middleware/auth.ts

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { redis } from '../config/db';
import { RedisKeys } from '../utils/redis-keys';
import { prisma } from '../config/db';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  token?: string;
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
    
    // Support both Authorization header and secure HttpOnly cookie
    const cookieToken = req.cookies?.brosync_access_token ||
      req.cookies?.accessToken ||
      req.cookies?.browsync_access_token;

    const token = bearerToken || cookieToken;

    if (!token) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token required',
        },
      });
    }

    // Verify token structure and signature
    const payload = verifyAccessToken(token);

    // Redis is a cache, not the source of truth. A cache restart must not log
    // every active user out, so validate against the persisted session record.
    const session = await prisma.session.findUnique({
      where: { token },
      select: { expiresAt: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { token } }).catch(() => null);
        await redis.del(RedisKeys.session(token)).catch(() => null);
      }
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Session expired or invalid',
        },
      });
    }

    req.user = payload;
    req.token = token;
    next();
  } catch (_error: any) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired access token',
      },
    });
  }
}

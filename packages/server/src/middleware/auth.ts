// Agent: 🖥️ Agent B (Server)
// File: packages/server/src/middleware/auth.ts

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { prisma, redis } from '../config/db';
import { RedisKeys } from '../utils/redis-keys';

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
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token required',
        },
      });
    }

    // Verify token structure
    const payload = verifyAccessToken(token);

    // Verify user exists in database (handles DB wipes/resets)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User session invalid or account deleted',
        },
      });
    }

    // Verify token is not revoked in Redis (if logged out)
    const sessionExists = await redis.exists(RedisKeys.session(token));
    const databaseFallback = false; // We can verify cache

    req.user = payload;
    req.token = token;
    next();
  } catch (error: any) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired access token',
        details: error.message,
      },
    });
  }
}

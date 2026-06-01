// Agent: 🖥️ Agent B (Server)
// File: packages/server/src/routes/auth.ts

import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma, redis } from '../config/db';
import { RedisKeys } from '../utils/redis-keys';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { registerSchema, loginSchema } from '@browsync/shared';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input fields',
          details: parseResult.error.flatten(),
        },
      });
    }

    const { email, displayName, password } = parseResult.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Email is already registered',
        },
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user in PG
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        displayName,
        passwordHash,
      },
    });

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
    };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Save session in PG
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        expiresAt,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    // Cache session in Redis
    const sessionKey = RedisKeys.session(accessToken);
    await redis.hset(sessionKey, {
      userId: user.id,
      displayName: user.displayName,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    });
    await redis.expire(sessionKey, 24 * 60 * 60); // 24 hours (matches access token expiry)

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    console.error('❌ Registration error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong on the server',
      },
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input fields',
          details: parseResult.error.flatten(),
        },
      });
    }

    const { email, password } = parseResult.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        },
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        },
      });
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
    };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Save session in PG
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        expiresAt,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    // Cache session in Redis
    const sessionKey = RedisKeys.session(accessToken);
    await redis.hset(sessionKey, {
      userId: user.id,
      displayName: user.displayName,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    });
    await redis.expire(sessionKey, 24 * 60 * 60); // 24 hours

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    console.error('❌ Login error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong on the server',
      },
    });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refresh token required',
        },
      });
    }

    // Verify token
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (err) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired refresh token',
        },
      });
    }

    // Find existing session in PG
    const existingSession = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!existingSession || existingSession.expiresAt < new Date()) {
      // Invalidate if found but expired, or just reject
      if (existingSession) {
        await prisma.session.delete({ where: { id: existingSession.id } });
      }
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Session expired or invalid',
        },
      });
    }

    // Generate new access and refresh tokens
    const tokenPayload = {
      userId: existingSession.user.id,
      email: existingSession.user.email,
      displayName: existingSession.user.displayName,
    };
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // Delete old session and create new rotated session
    await prisma.session.delete({ where: { id: existingSession.id } });
    await redis.del(RedisKeys.session(existingSession.token));

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.session.create({
      data: {
        userId: existingSession.userId,
        token: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    // Cache new session in Redis
    const sessionKey = RedisKeys.session(newAccessToken);
    await redis.hset(sessionKey, {
      userId: existingSession.user.id,
      displayName: existingSession.user.displayName,
      email: existingSession.user.email,
      createdAt: existingSession.user.createdAt.toISOString(),
    });
    await redis.expire(sessionKey, 24 * 60 * 60);

    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error: any) {
    console.error('❌ Token refresh error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong on the server',
      },
    });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const token = req.token;
    if (token) {
      // Delete session from Redis
      await redis.del(RedisKeys.session(token));
      // Delete session from PG
      await prisma.session.deleteMany({
        where: { token },
      });
    }

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('❌ Logout error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong during logout',
      },
    });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User profile not found',
        },
      });
    }

    return res.status(200).json(user);
  } catch (error: any) {
    console.error('❌ Auth me error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong fetching profile',
      },
    });
  }
});

export default router;

// Agent: 🖥️ Agent B (Server)
// File: packages/server/src/routes/admin.ts

import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/db';
import { ENV } from '../config/env';
import { createRateLimiter } from '../middleware/rate-limit';

const router = Router();
const KEEP_EMAIL = 'arjun@test.com';

const adminLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  endpoint: 'admin',
});

function requireCleanupSecret(req: any, res: any, next: any) {
  const cleanupSecret = ENV.ADMIN_CLEANUP_SECRET;
  if (!cleanupSecret) {
    return res.status(503).json({
      error: {
        code: 'ADMIN_DISABLED',
        message: 'Admin cleanup is disabled until ADMIN_CLEANUP_SECRET is configured',
      },
    });
  }

  const provided = String(req.headers['x-admin-cleanup-secret'] || '');
  const providedBuf = Buffer.from(provided);
  const secretBuf = Buffer.from(cleanupSecret);

  // Constant-time comparison to prevent timing attacks
  const isMatch = providedBuf.length === secretBuf.length && crypto.timingSafeEqual(providedBuf, secretBuf);

  if (!isMatch) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid cleanup secret',
      },
    });
  }

  next();
}

router.post('/purge-users', adminLimiter, requireCleanupSecret, async (_req, res) => {
  try {
    const keepUser = await prisma.user.findUnique({
      where: { email: KEEP_EMAIL },
    });

    if (!keepUser) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Keep user ${KEEP_EMAIL} not found`,
        },
      });
    }

    // Atomic transaction ensures all or nothing cleanup
    const [deletedSessions, deletedRoomMembers, deletedRooms, deletedUsers] = await prisma.$transaction([
      prisma.session.deleteMany({
        where: { userId: { not: keepUser.id } },
      }),
      prisma.roomMember.deleteMany({
        where: { userId: { not: keepUser.id } },
      }),
      prisma.room.deleteMany({
        where: { hostId: { not: keepUser.id } },
      }),
      prisma.user.deleteMany({
        where: { email: { not: KEEP_EMAIL } },
      }),
    ]);

    return res.status(200).json({
      status: 'OK',
      kept: {
        id: keepUser.id,
        email: keepUser.email,
        displayName: keepUser.displayName,
      },
      deleted: {
        users: deletedUsers.count,
        rooms: deletedRooms.count,
        roomMembers: deletedRoomMembers.count,
        sessions: deletedSessions.count,
      },
    });
  } catch (error: any) {
    console.error('❌ Admin purge error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to purge users',
      },
    });
  }
});

export default router;

// Agent: 🖥️ Agent B (Server)
// File: packages/server/src/routes/admin.ts

import { Router } from 'express';
import { prisma } from '../config/db';

const router = Router();
const CLEANUP_SECRET = process.env.ADMIN_CLEANUP_SECRET || '';
const KEEP_EMAIL = 'arjun@test.com';

function requireCleanupSecret(req: any, res: any, next: any) {
  if (!CLEANUP_SECRET) {
    return res.status(503).json({
      error: {
        code: 'ADMIN_DISABLED',
        message: 'Admin cleanup is disabled until ADMIN_CLEANUP_SECRET is configured',
      },
    });
  }

  const provided = String(req.headers['x-admin-cleanup-secret'] || '');
  if (!provided || provided !== CLEANUP_SECRET) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid cleanup secret',
      },
    });
  }

  next();
}

router.post('/purge-users', requireCleanupSecret, async (_req, res) => {
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

  const deletedSessions = await prisma.session.deleteMany({
    where: { userId: { not: keepUser.id } },
  });

  const deletedRoomMembers = await prisma.roomMember.deleteMany({
    where: { userId: { not: keepUser.id } },
  });

  const deletedRooms = await prisma.room.deleteMany({
    where: { hostId: { not: keepUser.id } },
  });

  const deletedUsers = await prisma.user.deleteMany({
    where: { email: { not: KEEP_EMAIL } },
  });

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
});

export default router;

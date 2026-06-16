// Agent: 🖥️ Agent B (Server)
// File: packages/server/src/routes/rooms.ts

import { Router, Response } from 'express';
import crypto from 'crypto';
import { prisma, redis } from '../config/db';
import { RedisKeys } from '../utils/redis-keys';
import { roomCreateSchema } from '@browsync/shared';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Helper to generate a 6-character unique room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid O, 0, I, 1 confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    code += chars.charAt(randomIndex);
  }
  return code;
}

// POST /api/rooms - Create a new co-browsing room
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const parseResult = roomCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input fields',
          details: parseResult.error.flatten(),
        },
      });
    }

    const { name, isPrivate, qualityPreset } = parseResult.data;
    const hostId = req.user!.userId;

    // Generate collision-resistant unique room code
    let roomCode = '';
    let codeIsUnique = false;
    let attempts = 0;

    while (!codeIsUnique && attempts < 10) {
      roomCode = generateRoomCode();
      const codeCheck = await prisma.room.findUnique({
        where: { roomCode },
      });
      if (!codeCheck) {
        codeIsUnique = true;
      }
      attempts++;
    }

    if (!codeIsUnique) {
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate a unique room code. Try again.',
        },
      });
    }

    // Insert room into PostgreSQL
    const room = await prisma.room.create({
      data: {
        roomCode,
        name,
        hostId,
        isPrivate,
        qualityPreset,
        status: 'WAITING',
      },
      include: {
        host: {
          select: { displayName: true },
        },
      },
    });

    // Write room meta cache to Redis
    const metaKey = RedisKeys.roomMeta(room.id);
    await redis.hset(metaKey, {
      id: room.id,
      hostId: room.hostId,
      hostName: room.host.displayName,
      roomCode: room.roomCode,
      name: room.name,
      status: room.status,
      quality: room.qualityPreset,
      createdAt: room.createdAt.toISOString(),
    });
    await redis.expire(metaKey, 24 * 60 * 60); // 24 Hours TTL

    // Build join link
    const hostHeader = req.headers.host || 'localhost:5173';
    const protocol = req.secure ? 'https' : 'http';
    const joinLink = `${protocol}://${hostHeader}/room/${room.roomCode}`;

    return res.status(201).json({
      id: room.id,
      roomCode: room.roomCode,
      name: room.name,
      joinLink,
      status: room.status,
      createdAt: room.createdAt,
    });
  } catch (error: any) {
    console.error('❌ Room creation error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create room',
      },
    });
  }
});

// GET /api/rooms/:code - Public room lookup by its 6-character code
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    if (!code || code.length !== 6) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Room code must be exactly 6 characters',
        },
      });
    }

    const roomCode = code.toUpperCase();

    // Query active or waiting room in PG
    const room = await prisma.room.findUnique({
      where: { roomCode },
      include: {
        host: {
          select: { displayName: true },
        },
      },
    });

    if (!room) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Room not found',
        },
      });
    }

    if (room.status === 'CLOSED') {
      return res.status(410).json({
        error: {
          code: 'ROOM_CLOSED',
          message: 'This session has already ended',
        },
      });
    }

    // Get active viewers from Redis Presence
    const presenceKey = RedisKeys.roomPresence(room.id);
    const viewerCount = await redis.zcard(presenceKey);

    return res.status(200).json({
      id: room.id,
      roomCode: room.roomCode,
      name: room.name,
      hostId: room.hostId,
      hostName: room.host.displayName,
      status: room.status,
      viewerCount: Math.max(0, viewerCount - 1), // Exclude the Host if present in count
      maxViewers: room.maxViewers,
    });
  } catch (error: any) {
    console.error('❌ Room fetch error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to look up room',
      },
    });
  }
});

// GET /api/rooms/my/history - Logged in user's hosted room list
router.get('/my/history', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const hostId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const total = await prisma.room.count({
      where: { hostId },
    });

    const rooms = await prisma.room.findMany({
      where: { hostId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        members: {
          select: { id: true },
        },
      },
    });

    const formattedRooms = rooms.map((r: any) => {
      let duration = 0;
      if (r.closedAt) {
        duration = Math.floor((r.closedAt.getTime() - r.createdAt.getTime()) / 1000);
      } else if (r.status === 'ACTIVE') {
        duration = Math.floor((Date.now() - r.createdAt.getTime()) / 1000);
      }

      return {
        id: r.id,
        roomCode: r.roomCode,
        name: r.name,
        status: r.status,
        viewerCount: r.members.length,
        createdAt: r.createdAt,
        closedAt: r.closedAt,
        duration,
        qualityPreset: r.qualityPreset,
      };
    });

    return res.status(200).json({
      rooms: formattedRooms,
      total,
      page,
      limit,
    });
  } catch (error: any) {
    console.error('❌ History fetch error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch room history',
      },
    });
  }
});

// PATCH /api/rooms/:id/close - Close streaming room (host only)
router.patch('/:id/close', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const hostId = req.user!.userId;

    const room = await prisma.room.findUnique({
      where: { id },
    });

    if (!room) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Room not found',
        },
      });
    }

    if (room.hostId !== hostId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Only the host is allowed to close this room',
        },
      });
    }

    // Update state in PG
    const updatedRoom = await prisma.room.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
      },
    });

    // Delete ephemeral keys from Redis (keep chat log with small expiry helper)
    await redis.del(RedisKeys.roomPresence(id));
    await redis.del(RedisKeys.roomAccessQueue(id));
    await redis.del(RedisKeys.roomController(id));
    
    // Set 1-hour expiry on metadata and chat history for post-session displays
    await redis.expire(RedisKeys.roomMeta(id), 3600);
    await redis.expire(RedisKeys.roomChat(id), 3600);

    return res.status(200).json({
      id: updatedRoom.id,
      status: updatedRoom.status,
      closedAt: updatedRoom.closedAt,
    });
  } catch (error: any) {
    console.error('❌ Room close error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to close room',
      },
    });
  }
});

export default router;

// Agent: 🖥️ Agent B (Server)
// File: packages/server/src/socket/control.handler.ts

import { Server, Socket } from 'socket.io';
import { redis } from '../config/db';
import { RedisKeys } from '../utils/redis-keys';
import { SOCKET_EVENTS, MemberRole, controlRequestSchema, controlGrantSchema } from '@browsync/shared';

export function registerControlHandlers(io: Server, socket: Socket) {
  // ── control:request event ────────────────────────────────────────
  socket.on(SOCKET_EVENTS.CONTROL_REQUEST, async (payload: { roomId: string }) => {
    try {
      const { roomId, userId, displayName, role } = socket.data;
      if (!roomId || !userId) return;

      // Validate inputs
      const parseResult = controlRequestSchema.safeParse(payload);
      if (!parseResult.success) return;

      // Guests can request control too (see PRD §13), but host cannot
      if (role === MemberRole.HOST) return;

      const queueKey = RedisKeys.roomAccessQueue(roomId);
      const controllerKey = RedisKeys.roomController(roomId);

      // Verify request is not already in the queue
      const existingQueue = await redis.lrange(queueKey, 0, -1);
      const isAlreadyQueued = existingQueue.some((str) => {
        const item = JSON.parse(str);
        return item.userId === userId;
      });

      if (isAlreadyQueued) return;

      const requestItem = {
        userId,
        displayName,
        requestedAt: Date.now(),
      };

      // Push to Redis Queue list
      await redis.rpush(queueKey, JSON.stringify(requestItem));
      const queuePosition = await redis.llen(queueKey);

      // Find host socket/room metadata
      const metaKey = RedisKeys.roomMeta(roomId);
      const hostId = await redis.hget(metaKey, 'hostId');

      if (hostId) {
        // Forward request details directly to the Host's private room
        io.to(hostId).emit(SOCKET_EVENTS.CONTROL_REQUEST_RECEIVED, {
          viewerId: userId,
          viewerName: displayName,
          queuePosition,
        });
      }
    } catch (err) {
      console.error('❌ Control request error:', err);
    }
  });

  // ── control:grant event ──────────────────────────────────────────
  socket.on(SOCKET_EVENTS.CONTROL_GRANT, async (payload: { roomId: string; viewerId: string }) => {
    try {
      const { roomId, userId: hostId, role } = socket.data;
      if (!roomId || !hostId || role !== MemberRole.HOST) return;

      // Validate inputs
      const parseResult = controlGrantSchema.safeParse(payload);
      if (!parseResult.success) return;

      const { viewerId } = parseResult.data;
      const queueKey = RedisKeys.roomAccessQueue(roomId);
      const controllerKey = RedisKeys.roomController(roomId);

      // Scrape access queue list to find target viewer's info
      const queueItems = await redis.lrange(queueKey, 0, -1);
      let targetViewerInfo: any = null;

      for (const itemStr of queueItems) {
        const parsed = JSON.parse(itemStr);
        if (parsed.userId === viewerId) {
          targetViewerInfo = parsed;
          break;
        }
      }

      if (!targetViewerInfo) return;

      // 1. Remove viewer from the queue list
      await redis.lrem(queueKey, 1, JSON.stringify(targetViewerInfo));

      // 2. Set active controller string details
      const controllerState = {
        userId: viewerId,
        displayName: targetViewerInfo.displayName,
        grantedAt: Date.now(),
      };
      await redis.set(controllerKey, JSON.stringify(controllerState));
      await redis.expire(controllerKey, 24 * 60 * 60);

      // 3. Emit control:granted directly to target viewer's channel
      io.to(viewerId).emit(SOCKET_EVENTS.CONTROL_GRANTED, {
        grantedAt: controllerState.grantedAt,
      });

      // 4. Notify everyone else in the room
      io.to(roomId).emit(SOCKET_EVENTS.PRESENCE_UPDATE, {
        userId: viewerId,
        status: 'controlling',
        lastSeen: Date.now(),
      });
    } catch (err) {
      console.error('❌ Control grant error:', err);
    }
  });

  // ── control:deny event ───────────────────────────────────────────
  socket.on(SOCKET_EVENTS.CONTROL_DENY, async (payload: { roomId: string; viewerId: string }) => {
    try {
      const { roomId, userId: hostId, role } = socket.data;
      if (!roomId || !hostId || role !== MemberRole.HOST) return;

      const { viewerId } = payload;
      const queueKey = RedisKeys.roomAccessQueue(roomId);

      // Scrape queue to find target viewer to remove
      const queueItems = await redis.lrange(queueKey, 0, -1);
      let targetViewerInfo: any = null;

      for (const itemStr of queueItems) {
        const parsed = JSON.parse(itemStr);
        if (parsed.userId === viewerId) {
          targetViewerInfo = parsed;
          break;
        }
      }

      if (targetViewerInfo) {
        await redis.lrem(queueKey, 1, JSON.stringify(targetViewerInfo));
      }

      // Notify denied viewer
      io.to(viewerId).emit(SOCKET_EVENTS.CONTROL_DENIED, {
        reason: 'Host denied your request',
      });
    } catch (err) {
      console.error('❌ Control deny error:', err);
    }
  });

  // ── control:revoke event ─────────────────────────────────────────
  socket.on(SOCKET_EVENTS.CONTROL_REVOKE, async (payload: { roomId: string }) => {
    try {
      const { roomId, userId: hostId, role } = socket.data;
      if (!roomId || !hostId || role !== MemberRole.HOST) return;

      const controllerKey = RedisKeys.roomController(roomId);
      const controllerStr = await redis.get(controllerKey);

      if (controllerStr) {
        const controller = JSON.parse(controllerStr);
        
        // Remove controller key
        await redis.del(controllerKey);

        // Notify viewer control revoked
        io.to(controller.userId).emit(SOCKET_EVENTS.CONTROL_REVOKED, {
          reason: 'Host revoked control',
        });

        // Notify room
        io.to(roomId).emit(SOCKET_EVENTS.CONTROL_RELEASED, {
          viewerId: controller.userId,
          reason: 'revoked',
        });
      }
    } catch (err) {
      console.error('❌ Control revoke error:', err);
    }
  });

  // ── control:release event ────────────────────────────────────────
  socket.on(SOCKET_EVENTS.CONTROL_RELEASE, async (payload: { roomId: string }) => {
    try {
      const { roomId, userId } = socket.data;
      if (!roomId || !userId) return;

      const controllerKey = RedisKeys.roomController(roomId);
      const controllerStr = await redis.get(controllerKey);

      if (controllerStr) {
        const controller = JSON.parse(controllerStr);
        
        // Voluntarily release if they hold the controller
        if (controller.userId === userId) {
          await redis.del(controllerKey);

          io.to(roomId).emit(SOCKET_EVENTS.CONTROL_RELEASED, {
            viewerId: userId,
            reason: 'released',
          });
        }
      }
    } catch (err) {
      console.error('❌ Control release error:', err);
    }
  });
}

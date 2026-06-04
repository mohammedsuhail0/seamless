// Agent: 🖥️ Agent B (Server)
// File: packages/server/src/socket/room.handler.ts

import { Server, Socket } from 'socket.io';
import { prisma, redis } from '../config/db';
import { RedisKeys } from '../utils/redis-keys';
import { verifyAccessToken } from '../utils/jwt';
import { SOCKET_EVENTS, MemberRole, RoomStatus } from '@browsync/shared';

// Tracks host disconnect timeouts to allow 60s reconnection
const hostDisconnectTimeouts = new Map<string, NodeJS.Timeout>();

export function registerRoomHandlers(io: Server, socket: Socket) {
  // ── room:join event ──────────────────────────────────────────────
  socket.on(
    SOCKET_EVENTS.ROOM_JOIN,
    async (payload: { roomCode: string; displayName: string; token?: string }) => {
      try {
        const { roomCode, displayName, token } = payload;

        if (!roomCode || roomCode.length !== 6) {
          return socket.emit(SOCKET_EVENTS.ROOM_ERROR, {
            code: 'VALIDATION_ERROR',
            message: 'Invalid room code',
          });
        }

        // 1. Look up room in database
        const room = await prisma.room.findUnique({
          where: { roomCode: roomCode.toUpperCase() },
          include: { host: true },
        });

        if (!room) {
          return socket.emit(SOCKET_EVENTS.ROOM_ERROR, {
            code: 'NOT_FOUND',
            message: 'Room not found',
          });
        }

        if (room.status === RoomStatus.CLOSED) {
          return socket.emit(SOCKET_EVENTS.ROOM_ERROR, {
            code: 'ROOM_CLOSED',
            message: 'This session has already ended',
          });
        }

        // 2. Resolve authentication role
        let userId: string | null = null;
        let role = MemberRole.GUEST;
        let finalDisplayName = displayName || 'Guest';

        if (token) {
          try {
            const decoded = verifyAccessToken(token);
            userId = decoded.userId;
            finalDisplayName = decoded.displayName;
            role = userId === room.hostId ? MemberRole.HOST : MemberRole.VIEWER;
          } catch (err) {
            console.warn('⚠️ Guest quick join — Token verification failed');
          }
        }

        const roomId = room.id;
        const presenceKey = RedisKeys.roomPresence(roomId);

        // 3. Enforce Max Viewers (7 viewers max, host does not count as viewer)
        if (role !== MemberRole.HOST) {
          const currentCount = await redis.zcard(presenceKey);
          
          // Get host state from presence to see if host is online
          const presenceMembers = await redis.zrange(presenceKey, 0, -1);
          let hostIsPresent = false;
          for (const memberStr of presenceMembers) {
            const m = JSON.parse(memberStr);
            if (m.role === MemberRole.HOST) {
              hostIsPresent = true;
              break;
            }
          }
          
          const viewerCount = hostIsPresent ? currentCount - 1 : currentCount;
          if (viewerCount >= 7) {
            return socket.emit(SOCKET_EVENTS.ROOM_ERROR, {
              code: 'ROOM_FULL',
              message: 'This room is currently full (7/7 viewers)',
            });
          }
        }

        // 4. Create unique guest or viewer ID if not logged in
        const socketUserId = userId || `guest_${socket.id.substring(0, 8)}`;
        const presenceMember = {
          userId: socketUserId,
          displayName: finalDisplayName,
          role,
          socketId: socket.id,
        };

        // 5. Cancel Host Disconnect Timeout if host rejoined
        if (role === MemberRole.HOST) {
          const activeTimeout = hostDisconnectTimeouts.get(roomId);
          if (activeTimeout) {
            clearTimeout(activeTimeout);
            hostDisconnectTimeouts.delete(roomId);
            console.log(`🔌 Host reconnected within 60s for room ${room.roomCode}`);
          }

          // If room was WAITING, set status to ACTIVE on host join
          if (room.status === RoomStatus.WAITING) {
            await prisma.room.update({
              where: { id: roomId },
              data: { status: RoomStatus.ACTIVE },
            });
            await redis.hset(RedisKeys.roomMeta(roomId), { status: RoomStatus.ACTIVE });
          }
        }

        // 6. Write presence into PostgreSQL and Redis presence ZSET
        if (userId) {
          await prisma.roomMember.upsert({
            where: {
              roomId_userId: {
                roomId,
                userId,
              },
            },
            update: {
              role,
              displayName: finalDisplayName,
              leftAt: null,
            },
            create: {
              roomId,
              userId,
              role,
              displayName: finalDisplayName,
            },
          });
        } else {
          // Anonymous Guest: Write to DB with null userId to satisfy foreign key constraints
          await prisma.roomMember.create({
            data: {
              roomId,
              userId: null,
              role,
              displayName: finalDisplayName,
            },
          });
        }

        // Add to Redis Presence Sorted Set (score is timestamp)
        await redis.zadd(presenceKey, Date.now(), JSON.stringify(presenceMember));
        await redis.expire(presenceKey, 24 * 60 * 60);

        // Store room details on socket instance context
        socket.data.roomId = roomId;
        socket.data.userId = socketUserId;
        socket.data.displayName = finalDisplayName;
        socket.data.role = role;

        // 7. Join Socket.io room channel
        socket.join(roomId);

        // Join socket to its own userId channel for WebRTC signaling and remote control target routing
        socket.join(socketUserId);

        // Fetch current controller if any (defensively caught)
        let currentController = null;
        try {
          const controllerKey = RedisKeys.roomController(roomId);
          const controllerStr = await redis.get(controllerKey);
          if (controllerStr) {
            currentController = JSON.parse(controllerStr);
          }
        } catch (redisErr) {
          console.warn('⚠️ Failed to fetch current controller from Redis:', redisErr);
        }

        // Emit room joined configuration
        socket.emit(SOCKET_EVENTS.ROOM_JOINED, {
          roomId,
          userId: socketUserId,
          displayName: finalDisplayName,
          role,
          roomCode: room.roomCode,
          roomName: room.name,
          currentController,
        });

        // Emit presence sync of all active members
        const activePresenceList = await getActivePresenceMembers(roomId);
        socket.emit(SOCKET_EVENTS.PRESENCE_SYNC, {
          members: activePresenceList,
        });

        // Broadcast join message to others in room
        socket.to(roomId).emit(SOCKET_EVENTS.ROOM_JOINED, {
          userId: socketUserId,
          displayName: finalDisplayName,
          role,
          viewerCount: role === MemberRole.HOST ? activePresenceList.length : activePresenceList.length - 1,
        });

        // Push join system chat message to Redis
        const systemMessage = {
          id: `sys_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: null,
          displayName: 'System',
          text: `${finalDisplayName} joined the room`,
          timestamp: Date.now(),
          type: 'system',
        };
        const chatKey = RedisKeys.roomChat(roomId);
        await redis.rpush(chatKey, JSON.stringify(systemMessage));
        await redis.ltrim(chatKey, -200, -1);
        await redis.expire(chatKey, 24 * 60 * 60);

        io.to(roomId).emit(SOCKET_EVENTS.CHAT_MESSAGE_RECEIVED, systemMessage);

        // Send chat history to newly joined client
        const historyJson = await redis.lrange(chatKey, 0, -1);
        const history = historyJson.map((msg) => JSON.parse(msg));
        socket.emit(SOCKET_EVENTS.CHAT_HISTORY, { messages: history });
      } catch (err: any) {
        console.error('❌ Error joining socket room:', err);
        socket.emit(SOCKET_EVENTS.ROOM_ERROR, {
          code: 'INTERNAL_ERROR',
          message: `Failed to join streaming room: ${err.message || err}`,
        });
      }
    },
  );

  // ── presence:heartbeat event ─────────────────────────────────────
  socket.on(SOCKET_EVENTS.PRESENCE_HEARTBEAT, async () => {
    const { roomId, userId, displayName, role } = socket.data;
    if (!roomId || !userId) return;

    try {
      const presenceKey = RedisKeys.roomPresence(roomId);
      const member = {
        userId,
        displayName,
        role,
        socketId: socket.id,
      };

      // Update timestamp score
      await redis.zadd(presenceKey, Date.now(), JSON.stringify(member));
    } catch (err) {
      console.error('❌ Error handling heartbeat:', err);
    }
  });

  // ── room:leave event ─────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.ROOM_LEAVE, async () => {
    await handleUserLeavingRoom(io, socket);
  });

  // ── socket disconnect ────────────────────────────────────────────
  socket.on('disconnect', async () => {
    await handleUserLeavingRoom(io, socket);
  });
}

// Helper to scrape Redis for active presence members
async function getActivePresenceMembers(roomId: string): Promise<any[]> {
  try {
    const presenceKey = RedisKeys.roomPresence(roomId);
    
    // Prune heartbeats older than 60 seconds
    const cutoff = Date.now() - 60000;
    await redis.zremrangebyscore(presenceKey, '-inf', cutoff);

    const membersJson = await redis.zrange(presenceKey, 0, -1);
    return membersJson.map((str) => {
      const parsed = JSON.parse(str);
      return {
        userId: parsed.userId,
        displayName: parsed.displayName,
        role: parsed.role,
      };
    });
  } catch (err) {
    console.error('❌ Error syncing active presence list:', err);
    return [];
  }
}

// Primary cleanup when a host or viewer drops/leaves
async function handleUserLeavingRoom(io: Server, socket: Socket) {
  const { roomId, userId, displayName, role } = socket.data;
  if (!roomId || !userId) return;

  try {
    const presenceKey = RedisKeys.roomPresence(roomId);
    
    // Load members from presence
    const presenceListJson = await redis.zrange(presenceKey, 0, -1);
    let targetMemberStr = '';
    
    for (const memberStr of presenceListJson) {
      const m = JSON.parse(memberStr);
      if (m.userId === userId && m.socketId === socket.id) {
        targetMemberStr = memberStr;
        break;
      }
    }

    if (targetMemberStr) {
      await redis.zrem(presenceKey, targetMemberStr);
    }

    // Set PG RoomMember leftAt timestamp
    await prisma.roomMember.updateMany({
      where: { roomId, userId },
      data: { leftAt: new Date() },
    });

    // Check active viewers left
    const membersRemaining = await getActivePresenceMembers(roomId);

    // If host leaves, setup 60s shutdown timeout
    if (role === MemberRole.HOST) {
      console.log(`🔌 Host disconnected from room ${roomId}. Waiting 60 seconds...`);
      
      const timeout = setTimeout(async () => {
        try {
          // Verify host still offline
          const checkMembers = await getActivePresenceMembers(roomId);
          const hostRejoined = checkMembers.some(m => m.role === MemberRole.HOST);

          if (!hostRejoined) {
            console.log(`⏳ Host reconnection timeout reached. Automatically closing room ${roomId}`);
            
            // Mark Room CLOSED in PG
            await prisma.room.update({
              where: { id: roomId },
              data: { status: RoomStatus.CLOSED, closedAt: new Date() },
            });

            // Erase Redis states
            await redis.del(presenceKey);
            await redis.del(RedisKeys.roomAccessQueue(roomId));
            await redis.del(RedisKeys.roomController(roomId));
            await redis.expire(RedisKeys.roomMeta(roomId), 3600);
            await redis.expire(RedisKeys.roomChat(roomId), 3600);

            // Broadcast room:closed to remaining viewers
            io.to(roomId).emit(SOCKET_EVENTS.ROOM_CLOSED, {
              roomId,
              reason: 'Host disconnected and session timed out.',
            });
          }
        } catch (timeoutErr) {
          console.error('❌ Error handling host disconnect timeout:', timeoutErr);
        }
      }, 60000);

      hostDisconnectTimeouts.set(roomId, timeout);
    }

    // Check if leaving user held controller
    const controllerKey = RedisKeys.roomController(roomId);
    const currentControllerStr = await redis.get(controllerKey);
    
    if (currentControllerStr) {
      const currentController = JSON.parse(currentControllerStr);
      if (currentController.userId === userId) {
        await redis.del(controllerKey);
        io.to(roomId).emit(SOCKET_EVENTS.CONTROL_RELEASED, {
          viewerId: userId,
          reason: 'disconnected',
        });
      }
    }

    // Broadcast left event
    socket.to(roomId).emit(SOCKET_EVENTS.ROOM_LEFT, {
      userId,
      displayName,
      viewerCount: membersRemaining.length,
    });

    // Push system chat message log
    const systemMessage = {
      id: `sys_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: null,
      displayName: 'System',
      text: `${displayName} left the room`,
      timestamp: Date.now(),
      type: 'system',
    };
    
    const chatKey = RedisKeys.roomChat(roomId);
    await redis.rpush(chatKey, JSON.stringify(systemMessage));
    await redis.ltrim(chatKey, -200, -1);
    
    io.to(roomId).emit(SOCKET_EVENTS.CHAT_MESSAGE_RECEIVED, systemMessage);
    
    // Clear data attributes
    socket.data.roomId = null;
    socket.data.userId = null;
  } catch (err) {
    console.error('❌ Error handling user leave socket cleanup:', err);
  }
}

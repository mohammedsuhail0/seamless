// Agent: 🖥️ Agent B (Server)
// File: packages/server/src/socket/chat.handler.ts

import { Server, Socket } from 'socket.io';
import { redis } from '../config/db';
import { RedisKeys } from '../utils/redis-keys';
import { SOCKET_EVENTS, chatMessageSchema, chatReactionSchema } from '@browsync/shared';

export function registerChatHandlers(io: Server, socket: Socket) {
  // ── chat:message event ───────────────────────────────────────────
  socket.on(SOCKET_EVENTS.CHAT_MESSAGE, async (payload: { roomId: string; text: string }) => {
    try {
      const { roomId, userId, displayName } = socket.data;
      if (!roomId || !userId) return;

      // Validate inputs
      const parseResult = chatMessageSchema.safeParse(payload);
      if (!parseResult.success) {
        return socket.emit(SOCKET_EVENTS.ROOM_ERROR, {
          code: 'VALIDATION_ERROR',
          message: 'Message validation failed',
          details: parseResult.error.flatten(),
        });
      }

      const { text } = parseResult.data;

      // Create message model
      const message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId,
        displayName,
        text,
        timestamp: Date.now(),
        type: 'message',
      };

      // Store in Redis chat history list
      const chatKey = RedisKeys.roomChat(roomId);
      await redis.rpush(chatKey, JSON.stringify(message));
      await redis.ltrim(chatKey, -200, -1); // Cap history at last 200 messages
      await redis.expire(chatKey, 24 * 60 * 60); // 24h Expiry

      // Broadcast message to everyone in the room
      io.to(roomId).emit(SOCKET_EVENTS.CHAT_MESSAGE_RECEIVED, message);
    } catch (err) {
      console.error('❌ Chat handler error:', err);
    }
  });

  // ── chat:reaction event ──────────────────────────────────────────
  socket.on(SOCKET_EVENTS.CHAT_REACTION, async (payload: { roomId: string; emoji: string }) => {
    try {
      const { roomId, userId, displayName } = socket.data;
      if (!roomId || !userId) return;

      // Validate emoji
      const parseResult = chatReactionSchema.safeParse(payload);
      if (!parseResult.success) return;

      const { emoji } = parseResult.data;

      // Ephemeral broadcast to room (no DB / Redis saving)
      io.to(roomId).emit(SOCKET_EVENTS.CHAT_REACTION_RECEIVED, {
        userId,
        displayName,
        emoji,
      });
    } catch (err) {
      console.error('❌ Reaction handler error:', err);
    }
  });
}

// Agent: 🖥️ Agent B (Server)
// File: packages/server/src/utils/redis-keys.ts

export const RedisKeys = {
  roomPresence:    (roomId: string) => `room:${roomId}:presence`,
  roomChat:        (roomId: string) => `room:${roomId}:chat`,
  roomAccessQueue: (roomId: string) => `room:${roomId}:access_queue`,
  roomController:  (roomId: string) => `room:${roomId}:controller`,
  roomMeta:        (roomId: string) => `room:${roomId}:meta`,
  rateLimit:       (ip: string, endpoint: string) => `ratelimit:${ip}:${endpoint}`,
  session:         (token: string) => `session:${token}`,
} as const;

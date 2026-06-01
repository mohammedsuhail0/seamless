// Agent: 🔧 Agent A (Shared Package)
// File: packages/shared/src/constants/index.ts
export const SOCKET_EVENTS = {
    // Room signaling events
    ROOM_CREATE: 'room:create',
    ROOM_CREATED: 'room:created',
    ROOM_JOIN: 'room:join',
    ROOM_JOINED: 'room:joined',
    ROOM_LEAVE: 'room:leave',
    ROOM_LEFT: 'room:left',
    ROOM_CLOSE: 'room:close',
    ROOM_CLOSED: 'room:closed',
    ROOM_ERROR: 'room:error',
    // WebRTC dynamic handshake events
    RTC_OFFER: 'rtc:offer',
    RTC_ANSWER: 'rtc:answer',
    RTC_ICE_CANDIDATE: 'rtc:ice-candidate',
    // Interactive remote control request queue events
    CONTROL_REQUEST: 'control:request',
    CONTROL_REQUEST_RECEIVED: 'control:request-received',
    CONTROL_GRANT: 'control:grant',
    CONTROL_GRANTED: 'control:granted',
    CONTROL_DENY: 'control:deny',
    CONTROL_DENIED: 'control:denied',
    CONTROL_REVOKE: 'control:revoke',
    CONTROL_REVOKED: 'control:revoked',
    CONTROL_RELEASE: 'control:release',
    CONTROL_RELEASED: 'control:released',
    // Real-time chat & reactions events
    CHAT_MESSAGE: 'chat:message',
    CHAT_MESSAGE_RECEIVED: 'chat:message-received',
    CHAT_REACTION: 'chat:reaction',
    CHAT_REACTION_RECEIVED: 'chat:reaction-received',
    CHAT_HISTORY: 'chat:history',
    // Real-time membership presence events
    PRESENCE_HEARTBEAT: 'presence:heartbeat',
    PRESENCE_UPDATE: 'presence:update',
    PRESENCE_SYNC: 'presence:sync',
};
export const ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    ROOM_FULL: 'ROOM_FULL',
    ROOM_CLOSED: 'ROOM_CLOSED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
};
export const LIMITS = {
    MAX_VIEWERS: 7,
    CHAT_MAX_LENGTH: 500,
    CHAT_HISTORY_LIMIT: 200,
    HEARTBEAT_INTERVAL_MS: 30000,
    HEARTBEAT_TIMEOUT_MS: 60000,
};
//# sourceMappingURL=index.js.map
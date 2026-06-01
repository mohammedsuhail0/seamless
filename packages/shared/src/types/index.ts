// Agent: 🔧 Agent A (Shared Package)
// File: packages/shared/src/types/index.ts

import { QualityPreset, RoomStatus, MemberRole } from '../enums';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Room {
  id: string;
  roomCode: string;
  name: string;
  hostId: string;
  isPrivate: boolean;
  qualityPreset: QualityPreset;
  status: RoomStatus;
  maxViewers: number;
  createdAt: Date;
  closedAt?: Date | null;
}

export interface RoomMember {
  id: string;
  roomId: string;
  userId?: string | null;
  role: MemberRole;
  displayName: string;
  joinedAt: Date;
  leftAt?: Date | null;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface ChatMessage {
  id: string;
  userId: string | null; // null for guests or system
  displayName: string;
  text: string;
  timestamp: number;
  type: 'message' | 'system';
}

export interface ChatReaction {
  userId: string | null;
  displayName: string;
  emoji: '👍' | '😂' | '🔥' | '❤️' | '😮';
}

export interface PresenceMember {
  userId: string | null; // null for guests
  displayName: string;
  role: MemberRole;
  lastSeen: number; // timestamp
}

export interface ControlRequest {
  viewerId: string;
  viewerName: string;
  requestedAt: number;
}

export interface CurrentController {
  userId: string;
  displayName: string;
  grantedAt: number;
}

// ── WebRTC Input Event Streams ───────────────────────────────────

export interface MouseInput {
  type: 'mouse';
  event: 'move' | 'click' | 'mousedown' | 'mouseup' | 'scroll';
  button?: 'left' | 'right' | 'middle';
  x?: number; // 0.0 to 1.0 (normalized relative to viewer's viewport bounds)
  y?: number; // 0.0 to 1.0
  deltaX?: number;
  deltaY?: number;
  ts: number;
}

export interface KeyboardInput {
  type: 'keyboard';
  event: 'keydown' | 'keyup';
  keyCode: number; // Keyboard event code
  key: string;
  ts: number;
}

export type InputEvent = MouseInput | KeyboardInput;

// ── WebRTC Signaling Signals ─────────────────────────────────────

export interface RTCOfferSignal {
  targetUserId: string;
  sdp: any; // RTCSessionDescriptionInit
}

export interface RTCAnswerSignal {
  targetUserId: string;
  sdp: any; // RTCSessionDescriptionInit
}

export interface RTCIceCandidateSignal {
  targetUserId: string;
  candidate: any; // RTCIceCandidateInit
}

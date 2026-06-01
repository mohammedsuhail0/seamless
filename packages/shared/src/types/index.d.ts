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
    userId: string | null;
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
    userId: string | null;
    displayName: string;
    role: MemberRole;
    lastSeen: number;
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
export interface MouseInput {
    type: 'mouse';
    event: 'move' | 'click' | 'mousedown' | 'mouseup' | 'scroll';
    button?: 'left' | 'right' | 'middle';
    x?: number;
    y?: number;
    deltaX?: number;
    deltaY?: number;
    ts: number;
}
export interface KeyboardInput {
    type: 'keyboard';
    event: 'keydown' | 'keyup';
    keyCode: number;
    key: string;
    ts: number;
}
export type InputEvent = MouseInput | KeyboardInput;
export interface RTCOfferSignal {
    targetUserId: string;
    sdp: any;
}
export interface RTCAnswerSignal {
    targetUserId: string;
    sdp: any;
}
export interface RTCIceCandidateSignal {
    targetUserId: string;
    candidate: any;
}
//# sourceMappingURL=index.d.ts.map
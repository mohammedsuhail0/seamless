// Agent: 🔧 Agent A (Shared Package)
// File: packages/shared/src/schemas/index.ts
import { z } from 'zod';
import { QualityPreset } from '../enums';
export const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    displayName: z.string().min(2, 'Min 2 characters').max(50, 'Max 50 characters'),
    password: z.string()
        .min(8, 'Min 8 characters')
        .regex(/[A-Z]/, 'Must contain at least 1 uppercase letter')
        .regex(/[0-9]/, 'Must contain at least 1 number'),
});
export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password required'),
});
export const roomCreateSchema = z.object({
    name: z.string().min(1, 'Room name required').max(100, 'Max 100 characters'),
    isPrivate: z.boolean().optional().default(false),
    qualityPreset: z.nativeEnum(QualityPreset).optional().default(QualityPreset.AUTO),
});
export const roomJoinSchema = z.object({
    roomCode: z.string().length(6, 'Room code must be exactly 6 characters').toUpperCase(),
    displayName: z.string().min(1, 'Name required').max(50, 'Max 50 characters'),
});
export const chatMessageSchema = z.object({
    roomId: z.string().cuid('Invalid room reference'),
    text: z.string().min(1, 'Message cannot be empty').max(500, 'Max 500 characters'),
});
export const chatReactionSchema = z.object({
    roomId: z.string().cuid('Invalid room reference'),
    emoji: z.enum(['👍', '😂', '🔥', '❤️', '😮']),
});
export const controlRequestSchema = z.object({
    roomId: z.string().cuid('Invalid room reference'),
});
export const controlGrantSchema = z.object({
    roomId: z.string().cuid('Invalid room reference'),
    viewerId: z.string().min(1, 'Viewer target required'),
});
//# sourceMappingURL=index.js.map
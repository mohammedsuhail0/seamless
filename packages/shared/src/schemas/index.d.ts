import { z } from 'zod';
import { QualityPreset } from '../enums';
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    displayName: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    displayName: string;
    password: string;
}, {
    email: string;
    displayName: string;
    password: string;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const roomCreateSchema: z.ZodObject<{
    name: z.ZodString;
    isPrivate: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    qualityPreset: z.ZodDefault<z.ZodOptional<z.ZodNativeEnum<typeof QualityPreset>>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    isPrivate: boolean;
    qualityPreset: QualityPreset;
}, {
    name: string;
    isPrivate?: boolean | undefined;
    qualityPreset?: QualityPreset | undefined;
}>;
export declare const roomJoinSchema: z.ZodObject<{
    roomCode: z.ZodString;
    displayName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    displayName: string;
    roomCode: string;
}, {
    displayName: string;
    roomCode: string;
}>;
export declare const chatMessageSchema: z.ZodObject<{
    roomId: z.ZodString;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    roomId: string;
    text: string;
}, {
    roomId: string;
    text: string;
}>;
export declare const chatReactionSchema: z.ZodObject<{
    roomId: z.ZodString;
    emoji: z.ZodEnum<["👍", "😂", "🔥", "❤️", "😮"]>;
}, "strip", z.ZodTypeAny, {
    roomId: string;
    emoji: "👍" | "😂" | "🔥" | "❤️" | "😮";
}, {
    roomId: string;
    emoji: "👍" | "😂" | "🔥" | "❤️" | "😮";
}>;
export declare const controlRequestSchema: z.ZodObject<{
    roomId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    roomId: string;
}, {
    roomId: string;
}>;
export declare const controlGrantSchema: z.ZodObject<{
    roomId: z.ZodString;
    viewerId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    roomId: string;
    viewerId: string;
}, {
    roomId: string;
    viewerId: string;
}>;
//# sourceMappingURL=index.d.ts.map
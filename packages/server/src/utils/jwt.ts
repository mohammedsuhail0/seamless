// Agent: 🖥️ Agent B (Server)
// File: packages/server/src/utils/jwt.ts

import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

export interface TokenPayload {
  userId: string;
  email: string;
  displayName: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ENV.ACCESS_TOKEN_SECRET, { expiresIn: '24h' });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, ENV.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ENV.ACCESS_TOKEN_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, ENV.REFRESH_TOKEN_SECRET) as TokenPayload;
}

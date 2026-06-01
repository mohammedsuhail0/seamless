// Agent: 🖥️ Agent B (Server)
// File: packages/server/src/utils/jwt.ts

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'browsync_access_secret_998811';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'browsync_refresh_secret_772233';

export interface TokenPayload {
  userId: string;
  email: string;
  displayName: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '24h' });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_TOKEN_SECRET) as TokenPayload;
}

// File: packages/server/src/config/env.ts
// Centralized, fail-fast environment configuration and validation

import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Insecure placeholder secrets that must never be accepted in production
const INSECURE_FALLBACK_ACCESS = 'browsync_access_secret_998811';
const INSECURE_FALLBACK_REFRESH = 'browsync_refresh_secret_772233';

function resolveJwtSecret(
  primaryKey: string,
  aliasKey: string,
  insecureFallback: string,
  secretName: string
): string {
  const configured = process.env[primaryKey] || process.env[aliasKey];

  if (isProduction) {
    if (!configured || configured === insecureFallback || configured.length < 32) {
      throw new Error(
        `🚨 [SECURITY CONFIG ERROR] ${secretName} must be configured with a strong secret (at least 32 characters) in production! ` +
        `Set ${primaryKey} or ${aliasKey} in your environment.`
      );
    }
    return configured;
  }

  // Development / Test fallback: generate an ephemeral cryptographic secret if missing or insecure
  if (!configured || configured === insecureFallback) {
    console.warn(
      `⚠️ [DEV WARNING] ${secretName} not securely configured. Using ephemeral cryptographic secret for this runtime session.`
    );
    return crypto.randomBytes(32).toString('hex');
  }

  return configured;
}

export const ENV = {
  NODE_ENV,
  IS_PRODUCTION: isProduction,
  PORT: parseInt(process.env.PORT || '3001', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'file:./prisma/dev.db',
  ACCESS_TOKEN_SECRET: resolveJwtSecret(
    'ACCESS_TOKEN_SECRET',
    'JWT_ACCESS_SECRET',
    INSECURE_FALLBACK_ACCESS,
    'ACCESS_TOKEN_SECRET'
  ),
  REFRESH_TOKEN_SECRET: resolveJwtSecret(
    'REFRESH_TOKEN_SECRET',
    'JWT_REFRESH_SECRET',
    INSECURE_FALLBACK_REFRESH,
    'REFRESH_TOKEN_SECRET'
  ),
  ADMIN_CLEANUP_SECRET: process.env.ADMIN_CLEANUP_SECRET || '',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  CORS_ORIGIN: process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS || '',
  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
};

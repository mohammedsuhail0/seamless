// Agent: 🖥️ Agent B (Server)
// File: packages/server/src/config/db.ts

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export const prisma = new PrismaClient();

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
export const redis = new Redis(redisUrl);

redis.on('connect', () => {
  console.log('📡 Connected to Redis cache');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

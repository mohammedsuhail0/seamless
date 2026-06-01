// Agent: 🖥️ Agent B (Server)
// File: packages/server/src/config/db.ts

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export const prisma = new PrismaClient();

// ── In-Memory Redis Mock Fallback ──────────────────────────────────
class InMemoryRedis {
  private store: Map<string, any> = new Map();
  private expirations: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    console.warn('⚠️  External Redis service not detected. Falling back to high-fidelity IN-MEMORY Cache.');
  }

  async ping() {
    return 'PONG';
  }

  async get(key: string) {
    return this.store.get(key) || null;
  }

  async set(key: string, value: string) {
    this.store.set(key, value);
    return 'OK';
  }

  async del(key: string) {
    this.store.delete(key);
    return 1;
  }

  async expire(key: string, seconds: number) {
    if (this.expirations.has(key)) {
      clearTimeout(this.expirations.get(key)!);
    }
    const timeout = setTimeout(() => {
      this.store.delete(key);
      this.expirations.delete(key);
    }, seconds * 1000);
    this.expirations.set(key, timeout);
    return 1;
  }

  async zcard(key: string) {
    const val = this.store.get(key);
    if (!val || !(val instanceof Map)) return 0;
    return val.size;
  }

  async zadd(key: string, score: number, value: string) {
    let val = this.store.get(key);
    if (!val || !(val instanceof Map)) {
      val = new Map();
      this.store.set(key, val);
    }
    val.set(value, score);
    return 1;
  }

  async zrange(key: string, start: number, end: number) {
    const val = this.store.get(key);
    if (!val || !(val instanceof Map)) return [];
    const sorted = Array.from(val.entries()).sort((a, b) => a[1] - b[1]);
    const sliced = end === -1 ? sorted.slice(start) : sorted.slice(start, end + 1);
    return sliced.map(entry => entry[0]);
  }

  async zrem(key: string, member: string) {
    const val = this.store.get(key);
    if (!val || !(val instanceof Map)) return 0;
    const deleted = val.delete(member);
    return deleted ? 1 : 0;
  }

  async zremrangebyscore(key: string, min: string | number, max: string | number) {
    const val = this.store.get(key);
    if (!val || !(val instanceof Map)) return 0;
    const minVal = min === '-inf' ? -Infinity : Number(min);
    const maxVal = max === '+inf' ? Infinity : Number(max);
    let count = 0;
    for (const [member, score] of val.entries()) {
      if (score >= minVal && score <= maxVal) {
        val.delete(member);
        count++;
      }
    }
    return count;
  }

  async rpush(key: string, value: string) {
    let val = this.store.get(key);
    if (!val || !Array.isArray(val)) {
      val = [];
      this.store.set(key, val);
    }
    val.push(value);
    return val.length;
  }

  async ltrim(key: string, start: number, end: number) {
    let val = this.store.get(key);
    if (!val || !Array.isArray(val)) return 'OK';
    const len = val.length;
    const trueStart = start < 0 ? len + start : start;
    const trueEnd = end < 0 ? len + end : end;
    const trimmed = val.slice(Math.max(0, trueStart), Math.min(len, trueEnd + 1));
    this.store.set(key, trimmed);
    return 'OK';
  }

  async lrange(key: string, start: number, end: number) {
    const val = this.store.get(key);
    if (!val || !Array.isArray(val)) return [];
    const len = val.length;
    const trueStart = start < 0 ? len + start : start;
    const trueEnd = end < 0 ? len + end : end;
    return val.slice(Math.max(0, trueStart), end === -1 ? len : Math.min(len, trueEnd + 1));
  }

  async hset(key: string, fieldValues: any) {
    let val = this.store.get(key);
    if (!val || !(val instanceof Map)) {
      val = new Map();
      this.store.set(key, val);
    }
    for (const [k, v] of Object.entries(fieldValues)) {
      val.set(k, String(v));
    }
    return 1;
  }

  async hgetall(key: string) {
    const val = this.store.get(key);
    if (!val || !(val instanceof Map)) return {};
    const obj: any = {};
    for (const [k, v] of val.entries()) {
      obj[k] = v;
    }
    return obj;
  }
}

// ── Redis Connection and Proxy ──────────────────────────────────────
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
let realRedisConnected = false;
let fallbackRedis: InMemoryRedis | null = null;

// Initialize real ioredis client with short connectTimeout and strict retry bounds
const realRedis = new Redis(redisUrl, {
  connectTimeout: 800,
  maxRetriesPerRequest: 0,
  retryStrategy: () => null, // Stop retrying instantly if connection fails
});

export const redis = new Proxy(realRedis, {
  get(target, prop) {
    if (fallbackRedis) {
      return (fallbackRedis as any)[prop];
    }

    const val = Reflect.get(target, prop);
    if (typeof val === 'function') {
      return (...args: any[]) => {
        if (fallbackRedis) {
          return (fallbackRedis as any)[prop](...args);
        }
        
        // Execute normally, catch errors to switch to in-memory fallback dynamically
        try {
          const res = val.apply(target, args);
          if (res instanceof Promise) {
            return res.catch((err) => {
              console.warn(`📡 Real Redis failed: ${err.message}. Switching to In-Memory fallback.`);
              fallbackRedis = new InMemoryRedis();
              return (fallbackRedis as any)[prop](...args);
            });
          }
          return res;
        } catch (err: any) {
          console.warn(`📡 Real Redis failed: ${err.message}. Switching to In-Memory fallback.`);
          fallbackRedis = new InMemoryRedis();
          return (fallbackRedis as any)[prop](...args);
        }
      };
    }
    return val;
  }
});

realRedis.on('connect', () => {
  console.log('📡 Connected to Redis cache');
  realRedisConnected = true;
});

realRedis.on('error', (err) => {
  if (!realRedisConnected && !fallbackRedis) {
    console.warn(`📡 Real Redis failed: ${err.message}. Activating IN-MEMORY fallback.`);
    fallbackRedis = new InMemoryRedis();
  }
});

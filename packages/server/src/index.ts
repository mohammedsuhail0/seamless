// Agent: 🖥️ Agent B (Server)
// File: packages/server/src/index.ts

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { ENV } from './config/env';

import authRouter from './routes/auth';
import adminRouter from './routes/admin';
import roomsRouter from './routes/rooms';
import rtcRouter from './routes/rtc';
import { registerRoomHandlers } from './socket/room.handler';
import { registerWebRTCHandlers } from './socket/webrtc.handler';
import { registerChatHandlers } from './socket/chat.handler';
import { registerControlHandlers } from './socket/control.handler';
import { prisma, redis } from './config/db';

const app = express();
const server = http.createServer(app);

// ── Cache Git commit hash once on startup to prevent blocking event loop ─
let cachedCommitHash = process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || '';
if (!cachedCommitHash) {
  try {
    cachedCommitHash = require('child_process').execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    cachedCommitHash = 'c51f951';
  }
}

// ── CORS Origin Resolution ─────────────────────────────────────────
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://localhost',
  'https://localhost',
  'capacitor://localhost',
  'ionic://localhost',
  'https://brosync.vercel.app',
  'https://browsync.vercel.app',
  'https://brosync.onrender.com',
  'https://browsync-api.onrender.com',
];

const envOrigins = ENV.CORS_ORIGIN
  ? ENV.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...envOrigins]));

const corsOriginDelegate = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => {
  // Allow requests with no origin (Electron desktop app, native tools, server-to-server)
  if (!origin) return callback(null, true);

  if (
    !ENV.IS_PRODUCTION ||
    allowedOrigins.includes(origin) ||
    origin.endsWith('.vercel.app') ||
    origin.endsWith('.onrender.com') ||
    origin.startsWith('http://localhost') ||
    origin.startsWith('https://localhost') ||
    origin.startsWith('capacitor://') ||
    origin.startsWith('ionic://')
  ) {
    return callback(null, true);
  }
  return callback(new Error('Origin blocked by CORS policy'));
};

// ── Security Headers & Cookie Parsing Middleware ───────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (ENV.IS_PRODUCTION || req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Parse Cookie header into req.cookies for zero-dependency cookie handling
  const rawCookie = req.headers.cookie;
  const cookies: Record<string, string> = {};
  if (rawCookie) {
    for (const item of rawCookie.split(';')) {
      const [k, ...v] = item.trim().split('=');
      if (k) cookies[k] = decodeURIComponent(v.join('='));
    }
  }
  (req as any).cookies = cookies;

  next();
});

// ── Express Middleware ───────────────────────────────────────────
app.use(cors({
  origin: corsOriginDelegate,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
}));
app.use(express.json({ limit: '1mb' }));

// ── REST Routes ──────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/rtc', rtcRouter);

// Fast health check endpoints for keepalive monitors and warmup pings
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

app.get('/ping', (_req, res) => {
  res.status(200).send('pong');
});

// Comprehensive deep health check endpoint
app.get('/api/health', async (_req, res) => {
  try {
    // Check DB connection
    await prisma.$queryRaw`SELECT 1`;
    // Check Redis connection
    await redis.ping();

    return res.status(200).json({
      status: 'OK',
      version: '1.0.1',
      commit: cachedCommitHash,
      timestamp: new Date(),
      services: {
        database: 'Connected',
        redis: 'Connected',
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'ERROR',
      message: ENV.IS_PRODUCTION ? 'Service health check failed' : error.message,
    });
  }
});

// ── Global Error Handler ─────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('💥 Unhandled server error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred on the server',
      details: !ENV.IS_PRODUCTION ? err.message : undefined,
    },
  });
});

// ── Socket.io Setup ──────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: corsOriginDelegate,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: socket.id=${socket.id}`);

  // Register Handlers
  registerRoomHandlers(io, socket);
  registerWebRTCHandlers(io, socket);
  registerChatHandlers(io, socket);
  registerControlHandlers(io, socket);

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: socket.id=${socket.id}`);
  });
});

// ── Server Start ─────────────────────────────────────────────────
const PORT = ENV.PORT;

async function bootstrap() {
  try {
    // Verify DB connects before binding ports
    await prisma.$connect();
    console.log('🐘 Connected to Database');

    server.listen(PORT, () => {
      console.log(`🚀 BroSync Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to bootstrap server:', error);
    process.exit(1);
  }
}

bootstrap();

// Agent: 🖥️ Agent B (Server)
// File: packages/server/src/index.ts

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import authRouter from './routes/auth';
import roomsRouter from './routes/rooms';
import { registerRoomHandlers } from './socket/room.handler';
import { registerWebRTCHandlers } from './socket/webrtc.handler';
import { registerChatHandlers } from './socket/chat.handler';
import { registerControlHandlers } from './socket/control.handler';
import { prisma, redis } from './config/db';

dotenv.config();

const app = express();
const server = http.createServer(app);

// ── Express Middleware ───────────────────────────────────────────
app.use(cors({
  origin: '*', // Whitelisted for dev testing
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
}));
app.use(express.json());

// ── REST Routes ──────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/rooms', roomsRouter);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check DB connection
    await prisma.$queryRaw`SELECT 1`;
    // Check Redis connection
    await redis.ping();
    
    let commitHash = 'unknown';
    try {
      commitHash = require('child_process').execSync('git rev-parse --short HEAD').toString().trim();
    } catch (e) {
      commitHash = 'c51f951'; // fallback/reference commit
    }
    
    return res.status(200).json({
      status: 'OK',
      version: '1.0.1',
      commit: commitHash,
      timestamp: new Date(),
      services: {
        database: 'Connected',
        redis: 'Connected',
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'ERROR',
      message: error.message,
    });
  }
});

// ── Global Error Handler ─────────────────────────────────────────
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('💥 Unhandled server error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred on the server',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    },
  });
});

// ── Socket.io Setup ──────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
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
const PORT = process.env.PORT || 3001;

async function bootstrap() {
  try {
    // Verify DB & Cache connects before binding ports
    await prisma.$connect();
    console.log('🐘 Connected to PostgreSQL database');

    server.listen(PORT, () => {
      console.log(`🚀 BrowSync Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to bootstrap server:', error);
    process.exit(1);
  }
}

bootstrap();

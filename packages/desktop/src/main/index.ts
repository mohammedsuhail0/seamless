// Agent: 💻 Agent D (Desktop Main Entry Point)
// File: packages/desktop/src/main/index.ts

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import dotenv from 'dotenv';
import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@browsync/shared';
import { getScreenCaptureSources } from './capture';
import { initializeInputInjection, injectInputEvent } from './input';

dotenv.config();

let mainWindow: BrowserWindow | null = null;
let hostSocket: Socket | null = null;
const serverUrl = process.env.SERVER_URL || 'http://localhost:3001';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'BrowSync Host Terminal',
    backgroundColor: '#0a0e27',
  });

  // Load local mock HTML inside host window or load custom interface
  // We will build a simple immersive HTML page for the host window
  const htmlPath = path.join(__dirname, '../../index.html');
  mainWindow.loadFile(htmlPath).catch((err: any) => {
    // If not found, load a dynamic HTML string
    mainWindow?.loadURL(
      `data:text/html,<html>
        <head>
          <title>BrowSync Host</title>
          <style>
            body { font-family: sans-serif; background: %230a0e27; color: %23f1f5f9; padding: 2rem; }
            .card { background: rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 8px; border: 1.5px solid rgba(255,255,255,0.08); margin-top: 1.5rem; }
            h1 { color: %23818cf8; }
            .badge { background: %2310b981; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>📡 BrowSync Host App</h1>
          <p>Local screening node is active and ready to stream regional browser tabs.</p>
          <div class="card">
            <h3>⚡ Signaling Connection</h3>
            <p>Status: <span class="badge">Online (Signaling Node connected)</span></p>
            <p>Target: ${serverUrl}</p>
          </div>
          <div class="card">
            <h3>🖱️ Remote Control Access Logs</h3>
            <p id="logs">Waiting for viewer inputs...</p>
          </div>
        </body>
      </html>`
    );
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Setup Socket signaling connection for Host
function initializeHostSocket() {
  hostSocket = io(serverUrl);

  hostSocket.on('connect', () => {
    console.log('🔌 Host signaling node connected to server');
    mainWindow?.webContents.send('host:socket-connected', { socketId: hostSocket?.id });
  });

  // Listen to viewer control requests relayed from Server
  hostSocket.on(SOCKET_EVENTS.CONTROL_REQUEST_RECEIVED, (payload) => {
    console.log(`👤 Control requested: viewerId=${payload.viewerId} | name=${payload.viewerName}`);
    
    // Relay control request to Electron window renderer UI
    if (mainWindow) {
      mainWindow.webContents.send('control:request-received', payload);
    }
  });

  // Listen to remote input coordinate triggers sent over signaling socket (or RTC Data Channel)
  hostSocket.on('input:relay', (event: any) => {
    console.log(`🖱️ Input Relayed over signaling: type=${event.type}`);
    injectInputEvent(event);
  });

  hostSocket.on(SOCKET_EVENTS.CONTROL_RELEASED, (payload: any) => {
    if (mainWindow) {
      mainWindow.webContents.send('control:released', payload);
    }
  });

  hostSocket.on(SOCKET_EVENTS.ROOM_JOINED, (payload: any) => {
    mainWindow?.webContents.send('host:room-joined', payload);
  });

  hostSocket.on(SOCKET_EVENTS.PRESENCE_SYNC, (payload: any) => {
    mainWindow?.webContents.send('host:presence-sync', payload);
  });

  hostSocket.on(SOCKET_EVENTS.ROOM_ERROR, (payload: any) => {
    mainWindow?.webContents.send('host:room-error', payload);
  });

  hostSocket.on(SOCKET_EVENTS.RTC_ANSWER, (payload: any) => {
    mainWindow?.webContents.send('host:rtc-answer', payload);
  });

  hostSocket.on(SOCKET_EVENTS.RTC_ICE_CANDIDATE, (payload: any) => {
    mainWindow?.webContents.send('host:rtc-ice-candidate', payload);
  });
}

app.whenReady().then(() => {
  initializeInputInjection();
  createWindow();
  initializeHostSocket();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handles matching bridge interfaces
ipcMain.handle('capture:sources', async () => {
  return await getScreenCaptureSources();
});

ipcMain.on('capture:select-source', (event: any, sourceId: any) => {
  console.log(`🖥️ Selected capture source: ${sourceId}`);
});

ipcMain.on('control:grant', (event: any, { roomId, viewerId }: any) => {
  if (hostSocket) {
    hostSocket.emit(SOCKET_EVENTS.CONTROL_GRANT, { roomId, viewerId });
  }
});

ipcMain.on('control:deny', (event: any, { roomId, viewerId }: any) => {
  if (hostSocket) {
    hostSocket.emit(SOCKET_EVENTS.CONTROL_DENY, { roomId, viewerId });
  }
});

ipcMain.on('control:revoke', (event: any, { roomId }: any) => {
  if (hostSocket) {
    hostSocket.emit(SOCKET_EVENTS.CONTROL_REVOKE, { roomId });
  }
});

ipcMain.handle('host:get-server-url', async () => {
  return serverUrl;
});

ipcMain.on('host:join-room', (_event: any, payload: { roomCode: string; displayName: string; token?: string }) => {
  if (!hostSocket) return;
  hostSocket.emit(SOCKET_EVENTS.ROOM_JOIN, payload);
});

ipcMain.on('host:rtc-offer', (_event: any, payload: { targetUserId: string; sdp: any }) => {
  if (!hostSocket) return;
  hostSocket.emit(SOCKET_EVENTS.RTC_OFFER, payload);
});

ipcMain.on('host:rtc-ice-candidate', (_event: any, payload: { targetUserId: string; candidate: any }) => {
  if (!hostSocket) return;
  hostSocket.emit(SOCKET_EVENTS.RTC_ICE_CANDIDATE, payload);
});

// Agent: 🌐 Agent C (Viewer App Socket Client)
// File: packages/viewer/src/lib/socket.ts

import { io, Socket } from 'socket.io-client';

class SocketClient {
  private socket: Socket | null = null;

  public connect(): Socket {
    if (this.socket) {
      if (this.socket.connected) return this.socket;
      this.socket.connect();
      return this.socket;
    }

    const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? ''
      : 'https://browsync-api.onrender.com';

    // Connects to server (Vite proxies WS traffic perfectly on dev, direct Render URL on production)
    this.socket = io(BACKEND_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected successfully:', this.socket?.id);
    });

    this.socket.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err.message);
    });

    this.socket.connect();
    return this.socket;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export const socketClient = new SocketClient();
export default socketClient;

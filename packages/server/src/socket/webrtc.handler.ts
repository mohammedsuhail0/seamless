// Agent: 🖥️ Agent B (Server)
// File: packages/server/src/socket/webrtc.handler.ts

import { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '@browsync/shared';

export function registerWebRTCHandlers(io: Server, socket: Socket) {
  // Relay WebRTC SDP Offer (typically Host → Viewer)
  socket.on(SOCKET_EVENTS.RTC_OFFER, (payload: { targetUserId: string; sdp: any }) => {
    const senderUserId = socket.data.userId;
    const roomId = socket.data.roomId;
    const { targetUserId, sdp } = payload || {};
    
    if (!senderUserId || !targetUserId || !roomId || !sdp) return;
    
    socket.to(targetUserId).emit(SOCKET_EVENTS.RTC_OFFER, {
      senderUserId,
      sdp,
    });
  });

  // Relay WebRTC SDP Answer (typically Viewer → Host)
  socket.on(SOCKET_EVENTS.RTC_ANSWER, (payload: { targetUserId: string; sdp: any }) => {
    const senderUserId = socket.data.userId;
    const roomId = socket.data.roomId;
    const { targetUserId, sdp } = payload || {};
    
    if (!senderUserId || !targetUserId || !roomId || !sdp) return;
    
    socket.to(targetUserId).emit(SOCKET_EVENTS.RTC_ANSWER, {
      senderUserId,
      sdp,
    });
  });

  // Relay WebRTC ICE Candidates (Bidirectional)
  socket.on(SOCKET_EVENTS.RTC_ICE_CANDIDATE, (payload: { targetUserId: string; candidate: any }) => {
    const senderUserId = socket.data.userId;
    const roomId = socket.data.roomId;
    const { targetUserId, candidate } = payload || {};
    
    if (!senderUserId || !targetUserId || !roomId || !candidate) return;
    
    socket.to(targetUserId).emit(SOCKET_EVENTS.RTC_ICE_CANDIDATE, {
      senderUserId,
      candidate,
    });
  });

  // Viewer asks the host to create a fresh offer after a failed/stalled peer connection
  socket.on(SOCKET_EVENTS.RTC_RECONNECT_REQUEST, (payload: { targetUserId: string }) => {
    const senderUserId = socket.data.userId;
    const roomId = socket.data.roomId;
    const { targetUserId } = payload || {};

    if (!senderUserId || !targetUserId || !roomId) return;

    socket.to(targetUserId).emit(SOCKET_EVENTS.RTC_RECONNECT_REQUEST, {
      senderUserId,
    });
  });
}

// Agent: 🖥️ Agent B (Server)
// File: packages/server/src/socket/webrtc.handler.ts

import { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '@browsync/shared';

export function registerWebRTCHandlers(io: Server, socket: Socket) {
  // Personal User ID socket joining for peer-to-peer route targeting
  const { userId } = socket.data;
  if (userId) {
    socket.join(userId);
  }

  // Relay WebRTC SDP Offer (typically Host → Viewer)
  socket.on(SOCKET_EVENTS.RTC_OFFER, (payload: { targetUserId: string; sdp: any }) => {
    const senderUserId = socket.data.userId;
    const { targetUserId, sdp } = payload;
    
    if (!senderUserId || !targetUserId) return;
    
    socket.to(targetUserId).emit(SOCKET_EVENTS.RTC_OFFER, {
      senderUserId,
      sdp,
    });
  });

  // Relay WebRTC SDP Answer (typically Viewer → Host)
  socket.on(SOCKET_EVENTS.RTC_ANSWER, (payload: { targetUserId: string; sdp: any }) => {
    const senderUserId = socket.data.userId;
    const { targetUserId, sdp } = payload;
    
    if (!senderUserId || !targetUserId) return;
    
    socket.to(targetUserId).emit(SOCKET_EVENTS.RTC_ANSWER, {
      senderUserId,
      sdp,
    });
  });

  // Relay WebRTC ICE Candidates (Bidirectional)
  socket.on(SOCKET_EVENTS.RTC_ICE_CANDIDATE, (payload: { targetUserId: string; candidate: any }) => {
    const senderUserId = socket.data.userId;
    const { targetUserId, candidate } = payload;
    
    if (!senderUserId || !targetUserId) return;
    
    socket.to(targetUserId).emit(SOCKET_EVENTS.RTC_ICE_CANDIDATE, {
      senderUserId,
      candidate,
    });
  });
}

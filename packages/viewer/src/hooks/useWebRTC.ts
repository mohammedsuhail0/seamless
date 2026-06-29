// Agent: 🌐 Agent C (WebRTC Streaming Client Hook)
// File: packages/viewer/src/hooks/useWebRTC.ts

import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { SOCKET_EVENTS, InputEvent } from '@browsync/shared';

interface UseWebRTCOptions {
  socket: Socket | null;
  roomId: string | null;
  role: string | null;
}

export function useWebRTC({ socket, roomId, role }: UseWebRTCOptions) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCIceConnectionState>('new');
  
  // Viewer refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const inputChannelRef = useRef<RTCDataChannel | null>(null);
  const controlChannelRef = useRef<RTCDataChannel | null>(null);
  const hostUserIdRef = useRef<string | null>(null);

  // Host refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const activeViewersRef = useRef<Set<string>>(new Set());

  // STUN servers configuration
  const iceConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  // Host helper: Create a WebRTC PeerConnection for a specific viewer
  const ensurePeerForViewer = async (viewerId: string) => {
    const localStream = localStreamRef.current;
    if (!localStream) return;
    if (peerConnectionsRef.current.has(viewerId)) return;

    try {
      console.log(`📡 Establishing peer connection for viewer: ${viewerId}`);
      const pc = new RTCPeerConnection(iceConfig);
      peerConnectionsRef.current.set(viewerId, pc);

      pc.oniceconnectionstatechange = () => {
        console.log(`📡 Peer connection state for ${viewerId}:`, pc.iceConnectionState);
        // Map viewer connection state to overall connection state
        if (pc.iceConnectionState === 'connected') {
          setConnectionState('connected');
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket?.emit(SOCKET_EVENTS.RTC_ICE_CANDIDATE, {
            targetUserId: viewerId,
            candidate: event.candidate,
          });
        }
      };

      // Add captured tracks to peer connection
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      // Initialize data channels for remote control inputs
      const inputChannel = pc.createDataChannel('input');
      inputChannel.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          console.log('🎮 Input event received from viewer:', parsed);
        } catch (e) {}
      };
      
      pc.createDataChannel('control');

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket?.emit(SOCKET_EVENTS.RTC_OFFER, {
        targetUserId: viewerId,
        sdp: offer,
      });
    } catch (err) {
      console.error(`❌ Failed to create peer connection for viewer ${viewerId}:`, err);
      peerConnectionsRef.current.delete(viewerId);
    }
  };

  // Host method: Capture screen/tab media
  const startCapture = async () => {
    if (role !== 'HOST') return;
    try {
      const capturedStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        } as any,
        audio: true
      });
      
      setStream(capturedStream);
      localStreamRef.current = capturedStream;

      // Handle user ending stream via browser's built-in "Stop sharing" toolbar
      capturedStream.getVideoTracks()[0].onended = () => {
        stopCapture();
      };

      // Connect to all viewers currently in the room
      activeViewersRef.current.forEach((viewerId) => {
        ensurePeerForViewer(viewerId);
      });
    } catch (err) {
      console.error('Failed to capture screen:', err);
      throw err;
    }
  };

  // Host method: Stop broadcasting stream
  const stopCapture = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setStream(null);
    
    // Terminate all peer connections
    peerConnectionsRef.current.forEach((pc) => {
      try { pc.close(); } catch (e) {}
    });
    peerConnectionsRef.current.clear();
    setConnectionState('new');
  };

  useEffect(() => {
    if (!socket || !roomId) return;

    if (role === 'HOST') {
      // Host-specific signaling events
      const handleAnswer = async (payload: { senderUserId: string; sdp: any }) => {
        const pc = peerConnectionsRef.current.get(payload.senderUserId);
        if (pc) {
          try {
            console.log('📬 RTC Answer received from Viewer:', payload.senderUserId);
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          } catch (err) {
            console.error('❌ Failed to set RTC Answer:', err);
          }
        }
      };

      const handleIceCandidateHost = async (payload: { senderUserId: string; candidate: any }) => {
        const pc = peerConnectionsRef.current.get(payload.senderUserId);
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (err) {
            console.error('❌ Failed to add ICE Candidate for viewer:', err);
          }
        }
      };

      const handleViewerJoined = (payload: { userId: string; role: string }) => {
        if (payload.userId && payload.role !== 'HOST') {
          activeViewersRef.current.add(payload.userId);
          if (localStreamRef.current) {
            console.log(`👤 Viewer joined: ${payload.userId}. Connecting peer...`);
            ensurePeerForViewer(payload.userId);
          }
        }
      };

      const handleViewerLeft = (payload: { userId: string }) => {
        if (payload.userId) {
          activeViewersRef.current.delete(payload.userId);
          const pc = peerConnectionsRef.current.get(payload.userId);
          if (pc) {
            console.log(`👤 Viewer left: ${payload.userId}. Disconnecting peer...`);
            try { pc.close(); } catch (e) {}
            peerConnectionsRef.current.delete(payload.userId);
          }
        }
      };

      const handlePresenceSync = (payload: { members: any[] }) => {
        activeViewersRef.current.clear();
        (payload.members || []).forEach(m => {
          if (m.role !== 'HOST') {
            activeViewersRef.current.add(m.userId);
          }
        });

        if (localStreamRef.current) {
          // Connect to all viewers in the updated set
          activeViewersRef.current.forEach(viewerId => {
            ensurePeerForViewer(viewerId);
          });
          
          // Prune viewers who left
          peerConnectionsRef.current.forEach((pc, viewerId) => {
            if (!activeViewersRef.current.has(viewerId)) {
              console.log(`Pruning stale peer connection for: ${viewerId}`);
              try { pc.close(); } catch (e) {}
              peerConnectionsRef.current.delete(viewerId);
            }
          });
        }
      };

      socket.on(SOCKET_EVENTS.RTC_ANSWER, handleAnswer);
      socket.on(SOCKET_EVENTS.RTC_ICE_CANDIDATE, handleIceCandidateHost);
      socket.on(SOCKET_EVENTS.ROOM_JOINED, handleViewerJoined);
      socket.on(SOCKET_EVENTS.ROOM_LEFT, handleViewerLeft);
      socket.on(SOCKET_EVENTS.PRESENCE_SYNC, handlePresenceSync);

      return () => {
        socket.off(SOCKET_EVENTS.RTC_ANSWER, handleAnswer);
        socket.off(SOCKET_EVENTS.RTC_ICE_CANDIDATE, handleIceCandidateHost);
        socket.off(SOCKET_EVENTS.ROOM_JOINED, handleViewerJoined);
        socket.off(SOCKET_EVENTS.ROOM_LEFT, handleViewerLeft);
        socket.off(SOCKET_EVENTS.PRESENCE_SYNC, handlePresenceSync);

        // Stop all active tracks and clean up connections
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
          localStreamRef.current = null;
        }
        peerConnectionsRef.current.forEach((pc) => {
          try { pc.close(); } catch (e) {}
        });
        peerConnectionsRef.current.clear();
        setStream(null);
      };
    } else {
      // Viewer-specific signaling events
      const pc = new RTCPeerConnection(iceConfig);
      peerConnectionRef.current = pc;

      pc.oniceconnectionstatechange = () => {
        setConnectionState(pc.iceConnectionState);
        console.log('📡 WebRTC ICE Connection State Changed:', pc.iceConnectionState);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          if (!hostUserIdRef.current) return;
          socket.emit(SOCKET_EVENTS.RTC_ICE_CANDIDATE, {
            targetUserId: hostUserIdRef.current,
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        console.log('📺 Stream track received successfully');
        if (event.streams && event.streams[0]) {
          setStream(event.streams[0]);
        }
      };

      pc.ondatachannel = (event) => {
        const channel = event.channel;
        console.log(`🔀 WebRTC Data Channel received: label=${channel.label}`);
        
        if (channel.label === 'input') {
          inputChannelRef.current = channel;
        } else if (channel.label === 'control') {
          controlChannelRef.current = channel;
        }
      };

      const handleOffer = async (payload: { senderUserId: string; sdp: any }) => {
        try {
          console.log('📬 WebRTC Offer received from Host');
          hostUserIdRef.current = payload.senderUserId;
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit(SOCKET_EVENTS.RTC_ANSWER, {
            targetUserId: payload.senderUserId,
            sdp: answer,
          });
        } catch (err) {
          console.error('❌ Failed to handle RTC Offer:', err);
        }
      };

      const handleIceCandidateViewer = async (payload: { senderUserId: string; candidate: any }) => {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (err) {
          console.error('❌ Failed to add ICE Candidate:', err);
        }
      };

      socket.on(SOCKET_EVENTS.RTC_OFFER, handleOffer);
      socket.on(SOCKET_EVENTS.RTC_ICE_CANDIDATE, handleIceCandidateViewer);

      return () => {
        socket.off(SOCKET_EVENTS.RTC_OFFER, handleOffer);
        socket.off(SOCKET_EVENTS.RTC_ICE_CANDIDATE, handleIceCandidateViewer);
        
        pc.close();
        peerConnectionRef.current = null;
        hostUserIdRef.current = null;
        setStream(null);
      };
    }
  }, [socket, roomId, role]);

  const sendInputEvent = (event: InputEvent) => {
    const channel = inputChannelRef.current;
    if (channel && channel.readyState === 'open') {
      channel.send(JSON.stringify(event));
    }
  };

  return {
    stream,
    connectionState,
    sendInputEvent,
    isDataChannelOpen: inputChannelRef.current?.readyState === 'open',
    startCapture,
    stopCapture,
  };
}

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

export function useWebRTC({ socket, roomId, role: _role }: UseWebRTCOptions) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCIceConnectionState>('new');
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const inputChannelRef = useRef<RTCDataChannel | null>(null);
  const controlChannelRef = useRef<RTCDataChannel | null>(null);

  // STUN servers configuration
  const iceConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  useEffect(() => {
    if (!socket || !roomId) return;

    // Viewers receive streams. Hosts broadcast streams.
    // Since viewers join the web app, let's setup the Peer Connection receiver.
    const pc = new RTCPeerConnection(iceConfig);
    peerConnectionRef.current = pc;

    // Track state change
    pc.oniceconnectionstatechange = () => {
      setConnectionState(pc.iceConnectionState);
      console.log('📡 WebRTC ICE Connection State Changed:', pc.iceConnectionState);
    };

    // Gather and relay ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit(SOCKET_EVENTS.RTC_ICE_CANDIDATE, {
          targetUserId: 'HOST_ID_PLACEHOLDER', // Server routes candidates host <-> viewer
          candidate: event.candidate,
        });
      }
    };

    // When stream track arrives
    pc.ontrack = (event) => {
      console.log('📺 Stream track received successfully');
      if (event.streams && event.streams[0]) {
        setStream(event.streams[0]);
      }
    };

    // Data Channel triggers
    pc.ondatachannel = (event) => {
      const channel = event.channel;
      console.log(`🔀 WebRTC Data Channel received: label=${channel.label}`);
      
      if (channel.label === 'input') {
        inputChannelRef.current = channel;
      } else if (channel.label === 'control') {
        controlChannelRef.current = channel;
      }
    };

    // Signalling Listeners: Receive SDP Offer
    const handleOffer = async (payload: { senderUserId: string; sdp: any }) => {
      try {
        console.log('📬 WebRTC Offer received from Host');
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

    // Receive ICE Candidates from server relay
    const handleIceCandidate = async (payload: { senderUserId: string; candidate: any }) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch (err) {
        console.error('❌ Failed to add ICE Candidate:', err);
      }
    };

    socket.on(SOCKET_EVENTS.RTC_OFFER, handleOffer);
    socket.on(SOCKET_EVENTS.RTC_ICE_CANDIDATE, handleIceCandidate);

    return () => {
      socket.off(SOCKET_EVENTS.RTC_OFFER, handleOffer);
      socket.off(SOCKET_EVENTS.RTC_ICE_CANDIDATE, handleIceCandidate);
      
      pc.close();
      peerConnectionRef.current = null;
      setStream(null);
    };
  }, [socket, roomId]);

  // Transmit viewer inputs over WebRTC data channel
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
  };
}

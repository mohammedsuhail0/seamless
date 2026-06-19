// Agent: 🌐 Agent C (Viewer Screening Room Interface)
// File: packages/viewer/src/pages/Room.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import socketClient from '../lib/socket';
import { useWebRTC } from '../hooks/useWebRTC';
import { api } from '../lib/api';
import {
  SOCKET_EVENTS,
  MemberRole,
  ChatMessage,
  ChatReaction,
} from '@browsync/shared';
import {
  Gamepad2,
  Maximize2,
  Minimize2,
  Users,
  Smile,
  Send,
  MessageSquare,
  Copy,
  Check,
  Signal,
  Volume2,
  VolumeX
} from 'lucide-react';

interface RoomProps {
  roomCode: string;
  onNavigate: (page: 'landing' | 'dashboard' | 'room', contextCode?: string) => void;
  userContext: any;
}

const GoldLogoSVG = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 0 8px rgba(197, 168, 92, 0.4))' }}>
    <defs>
      <linearGradient id="gold-grad-logo" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#9A7A35" />
        <stop offset="25%" stopColor="#EAC775" />
        <stop offset="50%" stopColor="#BE9648" />
        <stop offset="75%" stopColor="#FDF1A9" />
        <stop offset="100%" stopColor="#A1813C" />
      </linearGradient>
    </defs>
    <path d="M33 26V56C33 60.5 37 62 41 62C45 62 45 58.5 45 56V32L33 26Z" stroke="url(#gold-grad-logo)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M39 33V52" stroke="url(#gold-grad-logo)" strokeWidth="4.5" strokeLinecap="round" />
    <path d="M45 42C48 32 54 30 57 32C61 34 61 48 57 52C55 54 53 56 53 59C53 62 57 62 61 62" stroke="url(#gold-grad-logo)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M57 34L77 44L57 54V34Z" stroke="url(#gold-grad-logo)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M62 40L70 44L62 48V40Z" stroke="url(#gold-grad-logo)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function Room({ roomCode, onNavigate, userContext }: RoomProps) {
  const [roomInfo, setRoomInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Chat list and reactions
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: string; emoji: string; drift: number }[]>([]);

  // Room presence & control queue
  const [activeMembers, setActiveMembers] = useState<any[]>([]);
  const [currentController, setCurrentController] = useState<any | null>(null);

  const [activeToast, setActiveToast] = useState<{ id: string; displayName: string; text: string } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [videoFit, setVideoFit] = useState<'contain' | 'cover' | 'fill'>('contain');
  const [videoPlaying, setVideoPlaying] = useState(false);
 
  // References
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const activeMembersRef = useRef<any[]>([]);
  const myUserIdRef = useRef<string | null>(null);
  const roomContainerRef = useRef<HTMLDivElement | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [role, setRole] = useState<MemberRole>(
    roomInfo?.hostId && userContext?.id && roomInfo.hostId === userContext.id
      ? MemberRole.HOST
      : MemberRole.VIEWER
  );

  const joinSocketRoom = useCallback((targetSocket: Socket) => {
    const token = localStorage.getItem('browsync_access_token') || undefined;
    targetSocket.emit(SOCKET_EVENTS.ROOM_JOIN, {
      roomCode: roomCode.toUpperCase(),
      displayName: userContext?.displayName || `Guest_${Math.floor(Math.random() * 1000)}`,
      token,
    });
  }, [roomCode, userContext?.displayName]);

  // 1. Fetch Room Meta Specs from REST API on join
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const data = await api.get(`/api/rooms/${roomCode}`);
        setRoomInfo(data);
      } catch (err: any) {
        setErrorMsg(err.error?.message || 'This room does not exist or has ended');
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [roomCode]);

  // 2. Connect to WebSocket Signaling Server
  useEffect(() => {
    if (loading || errorMsg) return;

    const nextSocket = socketClient.connect();
    socketRef.current = nextSocket;
    setSocket(nextSocket);

    const handleSocketConnect = () => {
      joinSocketRoom(nextSocket);
    };

    nextSocket.on('connect', handleSocketConnect);

    if (nextSocket.connected) {
      joinSocketRoom(nextSocket);
    }

    // Listeners: Room joined confirmation (authoritative role assignment)
    nextSocket.on(SOCKET_EVENTS.ROOM_JOINED, (payload: { 
      role?: MemberRole; 
      roomCode?: string; 
      userId?: string;
      currentController?: any;
    }) => {
      if (payload?.roomCode && payload?.role) {
        console.log('🔑 Authoritative role from server:', payload.role);
        setRole(payload.role);
      }
      if (payload?.userId) {
        setMyUserId(payload.userId);
        myUserIdRef.current = payload.userId;
      }
      if (payload?.currentController) {
        setCurrentController(payload.currentController);
      }
    });

    // Listeners: Sync Room Members presences
    nextSocket.on(SOCKET_EVENTS.PRESENCE_SYNC, (payload: { members: any[] }) => {
      setActiveMembers(payload.members);
      activeMembersRef.current = payload.members;
    });

    // Listeners: Room join or signaling error
    nextSocket.on(SOCKET_EVENTS.ROOM_ERROR, (payload: { code: string; message: string }) => {
      console.error('❌ Room error from socket server:', payload);
      setErrorMsg(payload.message || 'Failed to join co-browsing room');
    });

    // Listeners: Dynamically sync controller changes via presence updates
    nextSocket.on(SOCKET_EVENTS.PRESENCE_UPDATE, (payload: { userId: string; status: string }) => {
      if (payload?.status === 'controlling' && payload?.userId) {
        const member = activeMembersRef.current.find((m) => m.userId === payload.userId);
        setCurrentController({
          userId: payload.userId,
          displayName: member?.displayName || 'Viewer',
          grantedAt: Date.now(),
        });
      }
    });

    // Listeners: Chat updates
    nextSocket.on(SOCKET_EVENTS.CHAT_HISTORY, (payload: { messages: ChatMessage[] }) => {
      setChatMessages(payload.messages);
    });

    nextSocket.on(SOCKET_EVENTS.CHAT_MESSAGE_RECEIVED, (message: ChatMessage) => {
      setChatMessages((prev) => [...prev, message]);
      
      // Trigger disappearing notification toast if the message is from someone else
      if (message.type !== 'system' && message.userId !== myUserIdRef.current) {
        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current);
        }
        
        setActiveToast({
          id: message.id || `${Date.now()}_${Math.random()}`,
          displayName: message.displayName || 'Guest',
          text: message.text,
        });

        toastTimeoutRef.current = setTimeout(() => {
          setActiveToast(null);
        }, 4000); // disappearing after 4 seconds
      }
    });

    // Listeners: Ephemeral emoji reactions received
    nextSocket.on(SOCKET_EVENTS.CHAT_REACTION_RECEIVED, (reaction: ChatReaction) => {
      const id = `${Date.now()}_${Math.random()}`;
      const drift = Math.floor(Math.random() * 80) - 40; // horizontal drift padding
      
      setFloatingEmojis((prev) => [...prev, { id, emoji: reaction.emoji, drift }]);
      
      // Auto-remove floating animation elements after 2 seconds
      setTimeout(() => {
        setFloatingEmojis((prev) => prev.filter((item) => item.id !== id));
      }, 2000);
    });

    // Listeners: Access controls granted
    nextSocket.on(SOCKET_EVENTS.CONTROL_GRANTED, (payload: { grantedAt: number }) => {
      setCurrentController({
        userId: myUserId || userContext?.id || nextSocket.id,
        displayName: userContext?.displayName || 'You',
        grantedAt: payload.grantedAt,
      });
    });

    nextSocket.on(SOCKET_EVENTS.CONTROL_DENIED, (payload: { reason: string }) => {
      alert(`Access Request Denied: ${payload.reason}`);
    });

    nextSocket.on(SOCKET_EVENTS.CONTROL_REVOKED, (payload: { reason: string }) => {
      setCurrentController(null);
      alert(`Control access has been revoked: ${payload.reason}`);
    });

    nextSocket.on(SOCKET_EVENTS.CONTROL_RELEASED, () => {
      setCurrentController(null);
    });

    nextSocket.on(SOCKET_EVENTS.ROOM_CLOSED, (payload: { reason: string }) => {
      alert(`Session Closed: ${payload.reason}`);
      onNavigate('dashboard');
    });

    return () => {
      nextSocket.emit(SOCKET_EVENTS.ROOM_LEAVE);
      nextSocket.off('connect', handleSocketConnect);
      nextSocket.off(SOCKET_EVENTS.ROOM_JOINED);
      nextSocket.off(SOCKET_EVENTS.PRESENCE_SYNC);
      nextSocket.off(SOCKET_EVENTS.ROOM_ERROR);
      nextSocket.off(SOCKET_EVENTS.PRESENCE_UPDATE);
      nextSocket.off(SOCKET_EVENTS.CHAT_HISTORY);
      nextSocket.off(SOCKET_EVENTS.CHAT_MESSAGE_RECEIVED);
      nextSocket.off(SOCKET_EVENTS.CHAT_REACTION_RECEIVED);
      nextSocket.off(SOCKET_EVENTS.CONTROL_GRANTED);
      nextSocket.off(SOCKET_EVENTS.CONTROL_DENIED);
      nextSocket.off(SOCKET_EVENTS.CONTROL_REVOKED);
      nextSocket.off(SOCKET_EVENTS.CONTROL_RELEASED);
      nextSocket.off(SOCKET_EVENTS.ROOM_CLOSED);
    };
  }, [loading, errorMsg, roomCode, joinSocketRoom]);

  useEffect(() => {
    if (!socket) return;
    const interval = window.setInterval(() => {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.PRESENCE_HEARTBEAT);
      }
    }, 25000);

    return () => window.clearInterval(interval);
  }, [socket]);

  // Scroll to bottom of chat list
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // 3. WebRTC Hooks setup

  useEffect(() => {
    if (roomInfo?.hostId && userContext?.id) {
      if (roomInfo.hostId === userContext.id) {
        setRole(MemberRole.HOST);
      } else {
        setRole(MemberRole.VIEWER);
      }
    }
  }, [roomInfo, userContext]);

  const { stream, connectionState, sendInputEvent, startCapture, stopCapture } = useWebRTC({
    socket,
    roomId: roomInfo?.id || null,
    role,
  });

  const handleStartCapture = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      alert("📺 Screen sharing is not supported on mobile devices. Please log in from a desktop browser (like Chrome, Edge, or Safari on Windows/macOS) to host and share your screen.");
      return;
    }
    try {
      await startCapture();
    } catch (err: any) {
      if (err?.name !== 'NotAllowedError') {
        alert("Failed to start screen capture: " + (err?.message || err));
      }
    }
  };

  // Attach stream to video tag
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = isMuted; // Sync with state to satisfy browser autoplay policies or user volume changes
      videoRef.current.play()
        .then(() => {
          setVideoPlaying(true);
        })
        .catch((err) => {
          console.warn('⚠️ Autoplay prevented by browser:', err);
          setVideoPlaying(false);
        });
    } else {
      setVideoPlaying(false);
    }
  }, [stream, isMuted]);

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!roomContainerRef.current) return;
    
    if (roomContainerRef.current.requestFullscreen) {
      if (!document.fullscreenElement) {
        roomContainerRef.current.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch(err => {
          console.error('Fullscreen failed:', err);
        });
      } else {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    } else if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
      // Graceful fallback for iOS (iPhone) Safari
      try {
        (videoRef.current as any).webkitEnterFullscreen();
      } catch (err) {
        console.error('iOS Fullscreen failed:', err);
      }
    } else {
      alert('Fullscreen is not supported on this browser/device.');
    }
  };

  const cycleVideoFit = () => {
    setVideoFit((prev) => {
      if (prev === 'contain') return 'cover';
      if (prev === 'cover') return 'fill';
      return 'contain';
    });
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (!showChat) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  useEffect(() => {
    if (!showChat) {
      resetControlsTimeout();
    } else {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showChat]);

  const isMeInControl =
    !!currentController &&
    !!myUserId &&
    currentController.userId === myUserId;

  const handleMouseMove = (e: React.MouseEvent<HTMLVideoElement>) => {
    if (!isMeInControl || !videoRef.current) return;

    const rect = videoRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    sendInputEvent({
      type: 'mouse',
      event: 'move',
      x,
      y,
      ts: Date.now(),
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLVideoElement>) => {
    if (!isMeInControl || !videoRef.current) return;

    const rect = videoRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const button = e.button === 0 ? 'left' : e.button === 2 ? 'right' : 'middle';

    sendInputEvent({
      type: 'mouse',
      event: 'mousedown',
      button,
      x,
      y,
      ts: Date.now(),
    });
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLVideoElement>) => {
    if (!isMeInControl || !videoRef.current) return;

    const rect = videoRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const button = e.button === 0 ? 'left' : e.button === 2 ? 'right' : 'middle';

    sendInputEvent({
      type: 'mouse',
      event: 'mouseup',
      button,
      x,
      y,
      ts: Date.now(),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLVideoElement>) => {
    if (!isMeInControl) return;
    
    // Prevent default keyboard browser actions (like scrolling down) if controlling
    e.preventDefault();

    sendInputEvent({
      type: 'keyboard',
      event: 'keydown',
      keyCode: e.keyCode,
      key: e.key,
      ts: Date.now(),
    });
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLVideoElement>) => {
    if (!isMeInControl) return;

    sendInputEvent({
      type: 'keyboard',
      event: 'keyup',
      keyCode: e.keyCode,
      key: e.key,
      ts: Date.now(),
    });
  };



  // Chat message send
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    socketRef.current?.emit(SOCKET_EVENTS.CHAT_MESSAGE, {
      roomId: roomInfo.id,
      text: chatInput,
    });
    setChatInput('');
  };

  // Emoji reaction broadcast
  const handleEmojiReaction = (emoji: '👍' | '😂' | '🔥' | '❤️' | '😮') => {
    socketRef.current?.emit(SOCKET_EVENTS.CHAT_REACTION, {
      roomId: roomInfo.id,
      emoji,
    });
    setShowEmojiPicker(false);
  };

  const handleCopyLink = () => {
    if (roomInfo) {
      const joinUrl = `${window.location.protocol}//${window.location.host}/room/${roomCode}`;
      navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // ── Layout loading states ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="room-page-root" style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold)', background: '#000000', gap: '1.25rem' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(197, 168, 92, 0.1)', borderTop: '3px solid var(--color-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, letterSpacing: '0.5px', fontFamily: 'var(--font-serif)' }}>Entering secure co-browsing chamber...</span>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="room-page-root" style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', background: '#000000', color: '#ffffff' }}>
        <span style={{ fontSize: '3.5rem', filter: 'drop-shadow(0 0 10px rgba(197, 168, 92, 0.3))' }}>🔍</span>
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, fontFamily: 'var(--font-serif)', color: '#ffffff' }}>{errorMsg}</h2>
        <button className="btn-red" onClick={() => onNavigate('dashboard')} style={{ padding: '0.75rem 2rem', fontSize: 'var(--text-sm)', fontWeight: 'bold' }}>
          Go to Lounge
        </button>
      </div>
    );
  }

  const handleContainerClick = (e: React.MouseEvent) => {
    if (isMeInControl) {
      resetControlsTimeout();
      return;
    }
    const target = e.target as HTMLElement;
    if (target.closest('.room-header') || target.closest('.room-footer') || target.closest('.chat-drawer')) {
      return;
    }
    setShowControls(prev => !prev);
    resetControlsTimeout();
  };

  return (
    <div 
      ref={roomContainerRef}
      className="room-container room-page-root"
      onMouseMove={resetControlsTimeout}
      onClick={handleContainerClick}
      onTouchStart={resetControlsTimeout}
      style={{ height: '100vh', position: 'relative', overflow: 'hidden', background: '#000000' }}
    >
      
      {/* Dynamic Floating reactions container */}
      {floatingEmojis.map((reaction) => (
        <div
          key={reaction.id}
          className="floating-emoji"
          style={{
            left: `calc(50% + ${reaction.drift}px)`,
            '--drift': `${reaction.drift * 2}px`,
          } as React.CSSProperties}
        >
          {reaction.emoji}
        </div>
      ))}

      {/* Chat Notification Toast */}
      {activeToast && (
        <div 
          className="glass toast-notification-left" 
          style={{
            position: 'absolute',
            top: showControls ? '5.5rem' : '1.5rem',
            left: '1.5rem',
            zIndex: 9999,
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid var(--color-gold)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem',
            maxWidth: '320px',
            width: 'max-content',
            pointerEvents: 'none',
            transition: 'top 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            💬 {activeToast.displayName}
          </span>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
            {activeToast.text}
          </span>
        </div>
      )}

      {/* Header bar */}
      <header 
        className="room-header" 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '0.85rem 1.5rem', 
          borderBottom: '1.5px solid var(--color-gold)',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          opacity: showControls ? 1 : 0,
          transform: showControls ? 'translateY(0)' : 'translateY(-100%)',
          pointerEvents: showControls ? 'auto' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost" onClick={() => onNavigate('dashboard')} style={{ padding: '0.4rem 0.6rem', color: '#ffffff' }}>
            ✕<span className="hide-mobile"> Leave Lounge</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: '1rem' }}>
            <GoldLogoSVG size={28} />
            <div>
              <h1 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-gold)', fontFamily: 'var(--font-serif)' }}>{roomInfo?.name}</h1>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }} className="hide-mobile">Lounge Host: {roomInfo?.hostName}</span>
            </div>
          </div>
        </div>

        {/* Invite link copying utility */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="room-code-tag" style={{ fontFamily: 'var(--font-mono)', background: 'rgba(197, 168, 92, 0.05)', border: '1px solid rgba(197, 168, 92, 0.2)', padding: '0.35rem 0.65rem', borderRadius: '4px', fontSize: 'var(--text-xs)', letterSpacing: '1px', fontWeight: 600, color: 'var(--color-gold)' }}>
            <span className="hide-mobile">CODE: </span>{roomCode}
          </span>
          <button className="btn-gold-rejoin" onClick={handleCopyLink} style={{ padding: '0.35rem 0.75rem', fontSize: 'var(--text-xs)' }}>
            {copiedLink ? (
              <><Check size={12} /><span className="hide-mobile"> Copied</span></>
            ) : (
              <><Copy size={12} /><span className="hide-mobile"> Copy Invite</span></>
            )}
          </button>
        </div>
      </header>

      {/* Main split work area */}
      <div className="room-content" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', display: 'flex', overflow: 'hidden' }}>
        
        {/* Left Side: Stream Viewer */}
        <div className="stream-column" style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', background: '#000000' }}>
          
          {/* Active control badge overlay */}
          {isMeInControl && (
            <div className="glass" style={{ position: 'absolute', top: '1.25rem', left: '50%', transform: 'translateX(-50%)', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: 'var(--text-xs)', fontWeight: 'bold', zIndex: 10, display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--color-gold)', background: 'rgba(0,0,0,0.85)', color: '#ffffff', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
              <Gamepad2 size={14} color="var(--color-gold)" /> You have browser sync control
            </div>
          )}

          {/* Full Stream rendering area */}
          <div 
            className="video-render-area"
            style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              position: 'relative', 
              padding: 0,
              background: '#000000',
            }}
          >
            {/* Portrait Orientation Assist Tip */}
            <div className="rotate-device-tip">
              <span>🔄 Rotate phone for larger theater view</span>
            </div>
            {stream ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted={isMuted}
                  tabIndex={0} // capture keyup/keydown events
                  onMouseMove={handleMouseMove}
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                  onPlay={() => setVideoPlaying(true)}
                  onPause={() => setVideoPlaying(false)}
                  className={isMeInControl ? 'glow-active' : ''}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: videoFit,
                    borderRadius: isFullscreen ? '0' : 'var(--radius-md)',
                    outline: 'none',
                    cursor: isMeInControl ? 'crosshair' : 'default',
                    border: isMeInControl ? '2.5px solid var(--color-gold)' : 'none',
                    boxShadow: isFullscreen ? 'none' : '0 15px 50px rgba(0,0,0,0.8)',
                  }}
                />
                {!videoPlaying && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(0, 0, 0, 0.8)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      zIndex: 20,
                      cursor: 'pointer',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (videoRef.current) {
                        videoRef.current.play().catch(err => console.warn('Play attempt failed:', err));
                      }
                    }}
                  >
                    <div 
                      className="glass"
                      style={{
                        padding: '2rem',
                        borderRadius: '8px',
                        border: '1.5px solid var(--color-gold)',
                        background: '#0c0c0c',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1rem',
                        textAlign: 'center',
                        maxWidth: '280px',
                      }}
                    >
                      <span style={{ fontSize: '3rem' }}>🍿</span>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-serif)' }}>
                        Host is Sharing Screen
                      </h3>
                      <button className="btn-red" style={{ width: '100%', fontSize: 'var(--text-xs)', padding: '0.65rem' }}>
                        Click to Play Stream
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : role === MemberRole.HOST ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem', filter: 'drop-shadow(0 0 10px rgba(197,168,92,0.3))' }}>🎬</div>
                <h3 style={{ fontWeight: 700, fontSize: '1.5rem', color: '#ffffff', fontFamily: 'var(--font-serif)' }}>Lounge Ready to Host</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: '0.5rem', maxWidth: '380px', marginInline: 'auto', lineHeight: 1.5 }}>
                  Share a browser window or tab containing your content. All connected viewers will watch in real-time.
                </p>
                <button 
                  className="btn-red" 
                  onClick={startCapture} 
                  style={{ marginTop: '1.5rem', display: 'inline-flex', gap: '0.5rem' }}
                >
                  📡 Start Lounge Stream
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem', filter: 'drop-shadow(0 0 10px rgba(197,168,92,0.3))' }}>📡</div>
                <h3 style={{ fontWeight: 700, fontSize: '1.5rem', color: '#ffffff', fontFamily: 'var(--font-serif)' }}>Waiting for Host to Screen...</h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Send invite link to friends to start watching together.</p>
              </div>
            )}
          </div>

          {/* Toolbar footer overlay */}
          <footer 
            className="room-footer" 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '0.75rem 1.5rem', 
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 30,
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(10px)',
              transition: 'opacity 0.3s ease, transform 0.3s ease',
              opacity: showControls ? 1 : 0,
              transform: showControls ? 'translateY(0)' : 'translateY(100%)',
              pointerEvents: showControls ? 'auto' : 'none',
            }}
          >
            <div style={{ display: 'flex', gap: '1rem' }}>
              {role === MemberRole.HOST && (
                <button 
                  className="btn-red" 
                  onClick={stream ? stopCapture : handleStartCapture}
                  style={{ width: 'auto', paddingInline: '1rem', height: '36px', fontSize: 'var(--text-xs)' }}
                >
                  📡 <span className="hide-mobile">{stream ? 'Stop Screen Share' : 'Start Screen Share'}</span>
                  <span className="show-mobile-only">{stream ? 'Stop' : 'Share'}</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Users size={14} /> {activeMembers.length}<span className="hide-mobile"> Watching</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Signal size={14} color={connectionState === 'connected' ? 'var(--color-success)' : 'var(--color-warning)'} /> 
                <span className="hide-mobile">Signal: </span>{connectionState}
              </span>
              {role !== MemberRole.HOST && (
                <button 
                  className="btn btn-ghost" 
                  style={{ padding: '0.4rem' }} 
                  onClick={toggleMute}
                  title={isMuted ? "Unmute Audio" : "Mute Audio"}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              )}
              <button 
                className="btn btn-ghost" 
                style={{ padding: '0.4rem', color: showChat ? 'var(--color-gold)' : 'inherit' }} 
                onClick={() => setShowChat(!showChat)}
                title={showChat ? "Hide Chat" : "Show Chat"}
              >
                <MessageSquare size={16} />
              </button>
              <button 
                className="btn btn-ghost" 
                style={{ padding: '0.4rem 0.6rem', fontSize: 'var(--text-xs)', fontWeight: 'bold', minWidth: '70px' }} 
                onClick={cycleVideoFit}
                title={`Current fit mode: ${videoFit.toUpperCase()}`}
              >
                {videoFit === 'contain' ? '📺 Fit' : videoFit === 'cover' ? '🔍 Zoom' : '↔️ Stretch'}
              </button>
              <button 
                className="btn btn-ghost" 
                style={{ padding: '0.4rem' }} 
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
          </footer>
        </div>

        {/* Right Side: Chat & Reaction Drawer */}
        <aside 
          className={`chat-drawer ${showChat ? 'open' : ''}`} 
          style={{ 
            borderLeft: '1.5px solid var(--color-gold)', 
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden',
            paddingTop: '60px',
            background: 'rgba(5, 5, 5, 0.95)',
          }}
        >
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <MessageSquare size={16} color="var(--color-gold)" />
              <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-gold)' }}>Lounge Chat</h2>
            </div>
            <button 
              className="btn btn-ghost" 
              style={{ padding: '0.2rem', minWidth: 'auto', display: 'inline-flex', height: 'auto', color: 'rgba(255,255,255,0.4)' }} 
              onClick={() => setShowChat(false)}
              title="Close Chat"
            >
              ✕
            </button>
          </div>

          {/* Chat scrolling feed */}
          <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {chatMessages.map((msg) => (
              <div 
                key={msg.id} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.15rem',
                  alignSelf: msg.type === 'system' ? 'center' : 'flex-start',
                  textAlign: msg.type === 'system' ? 'center' : 'left',
                  width: '100%',
                }}
              >
                {msg.type === 'system' ? (
                  <span style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.03)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    {msg.text}
                  </span>
                ) : (
                  <>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: msg.userId === userContext?.id ? 'var(--color-gold)' : 'rgba(255,255,255,0.7)' }}>
                      {msg.displayName}
                    </span>
                    <div style={{ background: msg.userId === userContext?.id ? 'rgba(197, 168, 92, 0.08)' : 'rgba(255,255,255,0.04)', border: msg.userId === userContext?.id ? '1px solid rgba(197, 168, 92, 0.15)' : '1px solid rgba(255,255,255,0.04)', padding: '0.5rem 0.75rem', borderRadius: '0 var(--radius-md) var(--radius-md) var(--radius-md)', fontSize: 'var(--text-sm)', width: 'fit-content', wordBreak: 'break-word', color: '#ffffff' }}>
                      {msg.text}
                    </div>
                  </>
                )}
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          {/* Emojis drawer overlay toggle */}
          {showEmojiPicker && (
            <div className="glass" style={{ padding: '0.5rem', display: 'flex', justifyItems: 'center', justifyContent: 'space-around', borderTop: '1px solid var(--border-default)', background: '#0a0a0a' }}>
              {(['👍', '😂', '🔥', '❤️', '😮'] as const).map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiReaction(emoji)}
                  style={{ fontSize: '1.5rem', border: 'none', background: 'none', cursor: 'pointer', padding: '0.25rem', transition: 'transform 0.1s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Message input footer */}
          <form onSubmit={handleSendChat} style={{ padding: '1rem', borderTop: '1px solid var(--border-default)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              type="button" 
              className="btn btn-ghost" 
              style={{ padding: '0.5rem', color: 'var(--color-gold)' }}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile size={18} />
            </button>
            <input
              type="text"
              placeholder="Send message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="premium-input"
              style={{ padding: '0.5rem 0.75rem', fontSize: 'var(--text-sm)', flex: 1 }}
            />
            <button type="submit" className="btn-red" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', width: '36px', height: '36px' }}>
              <Send size={16} />
            </button>
          </form>

        </aside>

      </div>
    </div>
  );
}

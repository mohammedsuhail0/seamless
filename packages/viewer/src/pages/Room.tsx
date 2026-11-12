// Agent: 🌐 Agent C (Viewer Screening Room Interface - Spatial Vision-OS Edition)
// File: packages/viewer/src/pages/Room.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import socketClient from '../lib/socket';
import { useWebRTC } from '../hooks/useWebRTC';
import { api } from '../lib/api';
import { sound } from '../lib/sound';
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
  VolumeX,
  Trash2,
  ArrowLeft,
  Tv,
  Play,
  X,
  Radio,
  Lock
} from 'lucide-react';
import { Capacitor, registerPlugin } from '@capacitor/core';

interface ScreenSharePlugin {
  isAvailable(): Promise<{ available: boolean }>;
  startCapture(options: { roomCode: string; serverUrl: string; token?: string; displayName?: string }): Promise<{ status: string }>;
  stopCapture(): Promise<{ status: string }>;
}

const NativeScreenShare = registerPlugin<ScreenSharePlugin>('BroSyncScreenShare');

interface RoomProps {
  roomCode: string;
  onNavigate: (page: 'landing' | 'dashboard' | 'room', contextCode?: string) => void;
  userContext: any;
}

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
  const [showChat, setShowChat] = useState(false);
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
  const roleRef = useRef<MemberRole>(role);
  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  const joinSocketRoom = useCallback((targetSocket: Socket) => {
    const token = localStorage.getItem('brosync_access_token') || localStorage.getItem('browsync_access_token') || undefined;
    const participantKey = `brosync_room_participant:${roomCode.toUpperCase()}`;
    let participantId = sessionStorage.getItem(participantKey) || sessionStorage.getItem(`browsync_room_participant:${roomCode.toUpperCase()}`);
    if (!participantId) {
      const suffix = typeof crypto?.randomUUID === 'function'
        ? crypto.randomUUID().replace(/-/g, '')
        : `${Date.now()}${Math.random().toString(36).slice(2)}`;
      participantId = `guest_${suffix}`;
      sessionStorage.setItem(participantKey, participantId);
    }

    targetSocket.emit(SOCKET_EVENTS.ROOM_JOIN, {
      roomCode: roomCode.toUpperCase(),
      displayName: userContext?.displayName || `Guest_${Math.floor(Math.random() * 1000)}`,
      token,
      participantId,
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
      setErrorMsg(payload.message || 'Failed to join watch room');
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
      
      // Trigger disappearing notification toast if the message is not a system message
      if (message.type !== 'system') {
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
        }, 5000);
      }
    });

    // Listeners: Ephemeral emoji reactions received
    nextSocket.on(SOCKET_EVENTS.CHAT_REACTION_RECEIVED, (reaction: ChatReaction) => {
      const id = `${Date.now()}_${Math.random()}`;
      const drift = Math.floor(Math.random() * 80) - 40;
      
      setFloatingEmojis((prev) => [...prev, { id, emoji: reaction.emoji, drift }]);
      
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
      if (roleRef.current !== MemberRole.HOST) {
        alert(`Session Closed: ${payload.reason}`);
      }
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
    const sendHeartbeat = () => {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.PRESENCE_HEARTBEAT);
      }
    };

    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, 15000);
    window.addEventListener('focus', sendHeartbeat);
    document.addEventListener('visibilitychange', sendHeartbeat);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', sendHeartbeat);
      document.removeEventListener('visibilitychange', sendHeartbeat);
    };
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

  const [isMobileNativeStreaming, setIsMobileNativeStreaming] = useState(false);

  const handleStartCapture = async () => {
    // 1. If running inside native Android app, use hardware ScreenCaptureService
    if (Capacitor.isNativePlatform()) {
      try {
        const avail = await NativeScreenShare.isAvailable();
        if (avail?.available) {
          const token = localStorage.getItem('brosync_access_token') || undefined;
          const serverUrl = api.getBaseUrl();
          const res = await NativeScreenShare.startCapture({
            roomCode: roomCode.toUpperCase(),
            serverUrl,
            token,
            displayName: userContext?.displayName || 'Mobile Host',
          });
          if (res?.status === 'streaming') {
            setIsMobileNativeStreaming(true);
          }
          return;
        }
      } catch (e: any) {
        if (e?.message && e.message.includes('cancelled')) {
          return;
        }
        console.warn('Native screen share error:', e);
        return;
      }
    }

    // 2. Mobile browsers (Chrome/Safari on mobile) cannot capture device screen due to OS sandbox
    const isMobileBrowser = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobileBrowser || !navigator.mediaDevices?.getDisplayMedia) {
      alert("📺 You are viewing from a mobile browser. To share your phone's full screen and apps with friends, open the BroSync Android App!");
      return;
    }

    // 3. Desktop browsers (Chrome, Edge, Firefox, Safari on PC/Mac)
    try {
      await startCapture();
    } catch (err: any) {
      if (err?.name !== 'NotAllowedError') {
        alert("Failed to start screen capture: " + (err?.message || err));
      }
    }
  };

  const handleStopCapture = async () => {
    if (isMobileNativeStreaming) {
      try {
        await NativeScreenShare.stopCapture();
      } catch (e) {}
      setIsMobileNativeStreaming(false);
    }
    stopCapture();
  };

  useEffect(() => {
    return () => {
      NativeScreenShare.stopCapture().catch(() => {});
    };
  }, []);

  // Attach stream to video tag
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = isMuted;
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
          try {
            const orientation = screen.orientation as any;
            if (orientation?.lock && window.matchMedia('(max-width: 768px)').matches) {
              orientation.lock('landscape').catch(() => {});
            }
          } catch {}
        }).catch(err => {
          console.error('Fullscreen failed:', err);
          setIsFullscreen(true);
        });
      } else {
        document.exitFullscreen().finally(() => setIsFullscreen(false));
      }
    } else if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
      try {
        (videoRef.current as any).webkitEnterFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error('iOS Fullscreen failed:', err);
        setIsFullscreen((current) => !current);
      }
    } else {
      setIsFullscreen((current) => !current);
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
      }, 3500);
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
  const handleEmojiReaction = (emoji: '👍' | '😂' | '🔥' | '❤️' | '😮' | '🍿') => {
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

  const handleCloseRoom = async () => {
    if (!roomInfo) return;
    if (!window.confirm('Are you sure you want to end this watch room? All guests will be disconnected.')) {
      return;
    }
    try {
      await api.patch(`/api/rooms/${roomInfo.id}/close`);
      onNavigate('dashboard');
    } catch (err) {
      console.error('Failed to close room:', err);
      alert('Failed to close watch room session.');
    }
  };

  // ── Layout loading states ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="relative min-h-[100dvh] w-full bg-[#08090e] flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-10 h-10 border-2 border-amber-500/20 border-t-amber-400 rounded-full animate-spin shadow-[0_0_24px_rgba(245,158,11,0.3)]" />
        <span className="text-xs font-mono font-medium text-amber-200/70 tracking-widest uppercase">
          Entering Watch Room...
        </span>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="relative min-h-[100dvh] w-full bg-[#08090e] flex flex-col items-center justify-center p-6 text-white text-center gap-5">
        <div className="p-4 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400">
          <Lock className="w-8 h-8" />
        </div>
        <div className="flex flex-col gap-1 max-w-sm">
          <h2 className="text-xl font-bold text-white tracking-tight">{errorMsg}</h2>
          <p className="text-xs text-white/50">The host may have ended this room or the code has expired.</p>
        </div>
        <button
          onClick={() => {
            sound.click();
            onNavigate('dashboard');
          }}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-black text-xs font-semibold tracking-wide shadow-lg active:scale-95 transition-all"
        >
          Return to Dashboard
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
      className={`relative w-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#08090e] text-[#F3F4F6] flex flex-col select-none ${isFullscreen ? 'is-room-expanded' : ''} ${showChat ? 'chat-is-open' : ''}`}
      onMouseMove={resetControlsTimeout}
      onClick={handleContainerClick}
      onTouchStart={resetControlsTimeout}
    >
      {/* Ambient Warm Golden Hour Light Dome */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 opacity-60"
        style={{
          background: `
            radial-gradient(800px circle at 50% 25%, rgba(245, 158, 11, 0.08), transparent 60%),
            radial-gradient(1100px circle at 85% 85%, rgba(99, 102, 241, 0.05), transparent 70%)
          `,
        }}
      />
      
      {/* Dynamic Floating reactions container */}
      {floatingEmojis.map((reaction) => (
        <div
          key={reaction.id}
          className="floating-emoji"
          style={{
            left: `calc(50% + ${reaction.drift}px)`,
            '--drift': `${reaction.drift * 2}px`,
            filter: 'drop-shadow(0 0 14px rgba(245, 158, 11, 0.5))',
          } as React.CSSProperties}
        >
          {reaction.emoji}
        </div>
      ))}

      {/* ── Top Header HUD Bar ── */}
      <header 
        className="room-header fixed top-0 left-0 right-0 z-40 px-3 sm:px-6 py-2.5 sm:py-3.5 bg-[#0d0e16]/85 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex items-center justify-between transition-all duration-300"
        style={{
          paddingTop: 'max(0.6rem, env(safe-area-inset-top, 0.6rem))',
          opacity: showControls ? 1 : 0,
          transform: showControls ? 'translateY(0)' : 'translateY(-100%)',
          pointerEvents: showControls ? 'auto' : 'none',
        }}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={() => {
              sound.click();
              onNavigate('dashboard');
            }} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-white/80 hover:text-white transition-all active:scale-95 border border-white/10"
            title="Leave Watch Room"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Leave</span>
          </button>

          {role === MemberRole.HOST && (
            <button 
              onClick={handleCloseRoom} 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/25 text-xs font-medium transition-all active:scale-95"
              title="Close Room for Everyone"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">End Room</span>
            </button>
          )}

          {/* Room Title & Host Info */}
          <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-white/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
            </span>
            <div className="flex flex-col">
              <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate max-w-[130px] sm:max-w-xs">
                {roomInfo?.name || 'BroSync Room'}
              </h1>
              <span className="text-[10px] text-white/40 hidden sm:inline">
                Host: {roomInfo?.hostName || 'Host'}
              </span>
            </div>
          </div>
        </div>

        {/* Room Code & Stats Utilities */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-mono font-bold tracking-wider shadow-[0_0_12px_rgba(245,158,11,0.15)]">
            <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>{roomCode}</span>
            <button 
              onClick={() => {
                sound.click();
                handleCopyLink();
              }} 
              className="p-1 hover:text-white transition-colors"
              title="Copy Room Link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-300/80" />}
            </button>
          </div>

          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/10 text-xs font-mono text-white/70">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>{activeMembers.length}</span>
            <Signal className={`w-3 h-3 hidden sm:inline ${connectionState === 'connected' ? 'text-emerald-400' : 'text-amber-400'}`} />
          </span>
        </div>
      </header>

      {/* ── Main Theater Area ── */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
        {/* Remote Control HUD Overlay */}
        {isMeInControl && (
          <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-[#0d0e16]/90 backdrop-blur-xl border border-amber-500/40 text-amber-200 text-xs font-semibold shadow-[0_4px_20px_rgba(245,158,11,0.3)] flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-amber-400" />
            <span>You have remote sync control</span>
          </div>
        )}

        {/* Video Canvas Container */}
        <div className="relative w-full h-full flex items-center justify-center">
          {stream ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isMuted}
                tabIndex={0}
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                onPlay={() => setVideoPlaying(true)}
                onPause={() => setVideoPlaying(false)}
                className={`w-full h-full ${isMeInControl ? 'glow-active cursor-crosshair' : 'cursor-default'}`}
                style={{
                  objectFit: videoFit,
                  outline: 'none',
                }}
              />

              {/* Click to Play unmuted stream overlay */}
              {!videoPlaying && (
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-30 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    sound.thud();
                    if (videoRef.current) {
                      videoRef.current.muted = false;
                      setIsMuted(false);
                      videoRef.current.play().catch(err => console.warn('Play attempt failed:', err));
                    }
                  }}
                >
                  <div className="p-6 sm:p-8 rounded-3xl bg-[#0d0e16]/95 border border-amber-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col items-center gap-4 text-center max-w-xs">
                    <span className="text-4xl animate-bounce">🍿</span>
                    <div className="flex flex-col gap-1">
                      <h3 className="text-base font-bold text-white tracking-tight">Stream is Live!</h3>
                      <p className="text-xs text-white/60">Click below to join with synchronized audio.</p>
                    </div>
                    <button className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-black font-semibold text-xs tracking-wide shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Watch Stream</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Floating Tap-to-Unmute capsule */}
              {videoPlaying && isMuted && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    sound.click();
                    toggleMute();
                  }}
                  className="absolute top-16 left-4 z-30 px-3.5 py-1.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-medium backdrop-blur-xl shadow-lg flex items-center gap-2 active:scale-95 transition-all"
                >
                  <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tap to Unmute</span>
                </button>
              )}
            </>
          ) : role === MemberRole.HOST ? (
            isMobileNativeStreaming ? (
              <div className="relative z-10 w-full max-w-sm sm:max-w-md mx-4 p-6 sm:p-8 rounded-3xl bg-[#0d0e16]/90 backdrop-blur-2xl border border-emerald-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.25)] animate-pulse">
                  <Tv className="w-7 h-7" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-semibold">Broadcasting Live</span>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Phone Screen Streaming</h3>
                  <p className="text-xs sm:text-sm text-white/60 leading-relaxed max-w-xs">
                    Viewers are watching your screen live with zero latency. You can switch to any app or game!
                  </p>
                </div>
                <button
                  onClick={() => {
                    sound.click();
                    handleStopCapture();
                  }}
                  className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs tracking-wide shadow-lg active:scale-95 transition-all"
                >
                  Stop Broadcasting
                </button>
              </div>
            ) : (
              <div className="relative z-10 w-full max-w-sm sm:max-w-md mx-4 p-6 sm:p-8 rounded-3xl bg-[#0d0e16]/90 backdrop-blur-2xl border border-white/[0.1] shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.25)]">
                  <Tv className="w-7 h-7" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Ready to Share Screen</h3>
                  <p className="text-xs sm:text-sm text-white/60 leading-relaxed max-w-xs">
                    Share your browser, desktop, or mobile app in real time with everyone in the room.
                  </p>
                </div>
                <button
                  onClick={() => {
                    sound.thud();
                    handleStartCapture();
                  }}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-black font-semibold text-sm tracking-wide shadow-[0_0_30px_rgba(245,158,11,0.35)] flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>Start Screen Share</span>
                </button>
              </div>
            )
          ) : (
            <div className="relative z-10 w-full max-w-sm sm:max-w-md mx-4 p-6 sm:p-8 rounded-3xl bg-[#0d0e16]/90 backdrop-blur-2xl border border-white/[0.1] shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.25)]">
                <span className="text-2xl animate-bounce">🍿</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Waiting for Host to Stream...</h3>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed max-w-xs">
                  Hang tight! When your friend starts sharing their screen, it will appear right here in real time.
                </p>
              </div>
              <button
                onClick={() => {
                  sound.click();
                  handleCopyLink();
                }}
                className="w-full py-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white font-medium text-xs tracking-wide flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/70" />}
                <span>{copiedLink ? 'Invite Link Copied!' : 'Copy Invite Link for Friends'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Portrait Orientation Tip */}
        <div className="rotate-device-tip">
          <span>🔄 Rotate phone for theater view</span>
        </div>
      </div>

      {/* ── Floating Bottom Toolbar Dock ── */}
      <footer 
        className="room-footer fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-3 sm:px-4 py-2 rounded-2xl bg-[#0d0e16]/90 backdrop-blur-2xl border border-white/[0.1] shadow-[0_16px_40px_rgba(0,0,0,0.6)] flex items-center gap-2 sm:gap-3 transition-all duration-300 max-w-[calc(100vw-2rem)]"
        style={{
          marginBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0.5rem))',
          opacity: showControls ? 1 : 0,
          transform: showControls ? 'translate(-50%, 0)' : 'translate(-50%, 150%)',
          pointerEvents: showControls ? 'auto' : 'none',
        }}
      >
        {/* Host Screen Share Trigger */}
        {role === MemberRole.HOST && (
          <button
            onClick={() => {
              sound.click();
              (stream || isMobileNativeStreaming) ? handleStopCapture() : handleStartCapture();
            }}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95
              ${(stream || isMobileNativeStreaming)
                ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md'}
            `}
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{(stream || isMobileNativeStreaming) ? 'Stop Sharing' : 'Share Screen'}</span>
          </button>
        )}

        {/* Audio Mute / Unmute */}
        {role !== MemberRole.HOST && (
          <button
            onClick={() => {
              sound.click();
              toggleMute();
            }}
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        )}

        {/* Video Fit Mode Switcher */}
        <button
          onClick={() => {
            sound.click();
            cycleVideoFit();
          }}
          title={`Fit: ${videoFit.toUpperCase()}`}
          className="px-2.5 py-1.5 rounded-xl text-xs font-mono font-medium text-white/70 hover:text-white hover:bg-white/[0.08] transition-all"
        >
          {videoFit === 'contain' ? '📺 Fit' : videoFit === 'cover' ? '🔍 Fill' : '↔️ Stretch'}
        </button>

        {/* Emoji Reaction Quick Bar */}
        <div className="relative">
          <button
            onClick={() => {
              sound.click();
              setShowEmojiPicker(!showEmojiPicker);
            }}
            title="Reactions"
            className={`p-2 rounded-xl transition-all ${showEmojiPicker ? 'bg-amber-500/20 text-amber-300' : 'text-white/70 hover:text-white hover:bg-white/[0.08]'}`}
          >
            <Smile className="w-4 h-4" />
          </button>

          {showEmojiPicker && (
            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 p-1.5 rounded-2xl bg-[#0d0e16]/95 backdrop-blur-2xl border border-white/[0.1] shadow-2xl flex items-center gap-1 z-50">
              {(['👍', '😂', '🔥', '❤️', '😮', '🍿'] as const).map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    sound.click();
                    handleEmojiReaction(emoji as any);
                  }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg hover:scale-125 hover:bg-white/[0.08] active:scale-95 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chat Drawer Toggle */}
        <button
          onClick={() => {
            sound.click();
            setShowChat(!showChat);
          }}
          title={showChat ? "Close Chat" : "Open Chat"}
          className={`p-2 rounded-xl transition-all flex items-center gap-1.5 ${showChat ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-white/70 hover:text-white hover:bg-white/[0.08]'}`}
        >
          <MessageSquare className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">Chat</span>
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={() => {
            sound.click();
            toggleFullscreen();
          }}
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.08] transition-all"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </footer>

      {/* ── Slide-Over Chat Drawer ── */}
      {showChat && (
        <aside 
          className="chat-drawer open fixed top-0 right-0 bottom-0 z-50 w-full sm:w-80 md:w-96 bg-[#0d0e16]/95 backdrop-blur-3xl border-l border-white/[0.09] shadow-[-20px_0_50px_rgba(0,0,0,0.8)] flex flex-col transition-all duration-300"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))' }}
        >
          {/* Chat Header */}
          <div className="px-4 py-3.5 border-b border-white/[0.07] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white tracking-tight">Room Chat</h2>
              <span className="text-[10px] font-mono text-white/40">({chatMessages.length})</span>
            </div>
            <button
              onClick={() => {
                sound.click();
                setShowChat(false);
              }}
              className="p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
              title="Close Chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Feed */}
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
            {chatMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white/40 gap-2">
                <Smile className="w-8 h-8 text-white/20" />
                <span className="text-xs">No messages yet. Say hi to everyone!</span>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isMe = msg.userId === userContext?.id || (myUserId && msg.userId === myUserId);
                if (msg.type === 'system') {
                  return (
                    <div key={msg.id} className="self-center text-center my-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-white/40 bg-white/[0.03] border border-white/[0.06]">
                        {msg.text}
                      </span>
                    </div>
                  );
                }
                return (
                  <div key={msg.id} className={`flex flex-col gap-1 max-w-[85%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                    <span className="text-[10px] font-mono text-white/40 px-1">
                      {isMe ? 'You' : msg.displayName}
                    </span>
                    <div className={`p-3 rounded-2xl text-xs leading-relaxed break-words ${isMe ? 'bg-amber-500/15 border border-amber-500/30 text-amber-100 rounded-tr-sm' : 'bg-white/[0.05] border border-white/[0.08] text-white/90 rounded-tl-sm'}`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input Footer */}
          <form 
            onSubmit={(e) => {
              handleSendChat(e);
              sound.thud();
            }}
            className="p-3 border-t border-white/[0.07] flex items-center gap-2"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))' }}
          >
            <input
              type="text"
              placeholder="Send message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400/80 transition-all"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center justify-center"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </aside>
      )}

      {/* ── Chat Notification Toast (Dynamic Island style) ── */}
      {activeToast && !showChat && (
        <div
          onClick={() => {
            sound.click();
            setShowChat(true);
            setActiveToast(null);
          }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-[#0d0e16]/95 backdrop-blur-2xl border border-amber-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex items-center gap-3 cursor-pointer max-w-xs transition-all hover:scale-105 active:scale-95 animate-fade-in"
        >
          <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[10px] flex items-center justify-center shrink-0">
            {activeToast.displayName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col overflow-hidden min-w-0">
            <span className="text-[11px] font-bold text-amber-300 truncate">{activeToast.displayName}</span>
            <span className="text-xs text-white/90 truncate">{activeToast.text}</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 shadow-[0_0_8px_#f59e0b]" />
        </div>
      )}
    </div>
  );
}

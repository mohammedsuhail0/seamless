// Agent: 🌐 Agent C (Viewer Screening Room Interface)
// File: packages/viewer/src/pages/Room.tsx

import React, { useState, useEffect, useRef } from 'react';
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
  VolumeX,
} from 'lucide-react';

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
  const [_isRequestingControl, setIsRequestingControl] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [videoFit, setVideoFit] = useState<'contain' | 'cover' | 'fill'>('contain');
 
  // References
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const activeMembersRef = useRef<any[]>([]);
  const roomContainerRef = useRef<HTMLDivElement | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    // Retrieve access token
    const token = localStorage.getItem('browsync_access_token') || undefined;

    // Join Socket Room
    nextSocket.emit(SOCKET_EVENTS.ROOM_JOIN, {
      roomCode: roomCode.toUpperCase(),
      displayName: userContext?.displayName || `Guest_${Math.floor(Math.random() * 1000)}`,
      token,
    });

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
      setIsRequestingControl(false);
    });

    nextSocket.on(SOCKET_EVENTS.CONTROL_DENIED, (payload: { reason: string }) => {
      alert(`Access Request Denied: ${payload.reason}`);
      setIsRequestingControl(false);
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
  }, [loading, errorMsg, roomCode]);

  // Scroll to bottom of chat list
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // 3. WebRTC Hooks setup
  const [role, setRole] = useState<MemberRole>(
    roomInfo?.hostId && userContext?.id && roomInfo.hostId === userContext.id
      ? MemberRole.HOST
      : MemberRole.VIEWER
  );

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

  // Attach stream to video tag
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = isMuted; // Sync with state to satisfy browser autoplay policies or user volume changes
      videoRef.current.play().catch((err) => {
        console.warn('⚠️ Autoplay prevented by browser:', err);
      });
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

  // 5. Interactive Control Requests
  const requestControlAccess = () => {
    if (isMeInControl) {
      // Voluntary release
      socketRef.current?.emit(SOCKET_EVENTS.CONTROL_RELEASE, { roomId: roomInfo.id });
      setCurrentController(null);
    } else {
      setIsRequestingControl(true);
      socketRef.current?.emit(SOCKET_EVENTS.CONTROL_REQUEST, { roomId: roomInfo.id });
    }
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
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Entering secure co-browsing chamber...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
        <span style={{ fontSize: '3rem' }}>🔍</span>
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800 }}>{errorMsg}</h2>
        <button className="btn btn-primary" onClick={() => onNavigate('landing')}>Go to Home</button>
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
      className="room-container"
      onMouseMove={resetControlsTimeout}
      onClick={handleContainerClick}
      onTouchStart={resetControlsTimeout}
      style={{ height: '100vh', position: 'relative', overflow: 'hidden', background: '#0a0e27' }}
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

      {/* Header bar */}
      <header 
        className="glass room-header" 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '0.75rem 1.5rem', 
          borderBottom: '1px solid var(--border-default)',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          opacity: showControls ? 1 : 0,
          transform: showControls ? 'translateY(0)' : 'translateY(-100%)',
          pointerEvents: showControls ? 'auto' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost" onClick={() => onNavigate('dashboard')} style={{ padding: '0.4rem 0.6rem' }}>
            ✕<span className="hide-mobile"> Leaving</span>
          </button>
          <div>
            <h1 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>{roomInfo?.name}</h1>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }} className="hide-mobile">Hosted by {roomInfo?.hostName}</span>
          </div>
        </div>

        {/* Invite link copying utility */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="room-code-tag" style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.04)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', letterSpacing: '0.5px' }}>
            CODE: {roomCode}
          </span>
          <button className="btn btn-secondary" onClick={handleCopyLink} style={{ padding: '0.25rem 0.75rem', fontSize: 'var(--text-xs)' }}>
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
        <div className="stream-column" style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', background: '#02040e' }}>
          
          {/* Active control badge overlay */}
          {isMeInControl && (
            <div className="glass" style={{ position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', fontWeight: 'bold', zIndex: 10, display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--color-primary)' }}>
              <Gamepad2 size={12} color="var(--color-primary)" /> You are in control of the host browser
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
                  border: isMeInControl ? '3px solid var(--color-primary)' : 'none',
                  boxShadow: isFullscreen ? 'none' : '0 10px 40px rgba(0,0,0,0.6)',
                }}
              />
            ) : role === MemberRole.HOST ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎬</div>
                <h3 style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>Chamber Ready to Host</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '0.5rem', maxWidth: '400px', marginInline: 'auto' }}>
                  Share a browser window or tab containing your content. All connected viewers will watch in real-time.
                </p>
                <button 
                  className="btn btn-primary" 
                  onClick={startCapture} 
                  style={{ marginTop: '1.5rem', width: 'auto', paddingInline: '2rem' }}
                >
                  📡 Start Screen Share
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📡</div>
                <h3 style={{ fontWeight: 600 }}>Waiting for host to start streaming...</h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Send invite link to friends to start watching together.</p>
              </div>
            )}
          </div>

          {/* Toolbar footer overlay */}
          <footer 
            className="glass room-footer" 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '0.75rem 1.5rem', 
              borderTop: '1px solid var(--border-default)',
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 30,
              transition: 'opacity 0.3s ease, transform 0.3s ease',
              opacity: showControls ? 1 : 0,
              transform: showControls ? 'translateY(0)' : 'translateY(100%)',
              pointerEvents: showControls ? 'auto' : 'none',
            }}
          >
            <div style={{ display: 'flex', gap: '1rem' }}>
              {role === MemberRole.HOST ? (
                <button 
                  className={`btn ${stream ? 'btn-secondary' : 'btn-primary'}`} 
                  onClick={stream ? stopCapture : startCapture}
                  style={{ width: 'auto', paddingInline: '0.75rem' }}
                >
                  📡 <span className="hide-mobile">{stream ? 'Stop Screen Share' : 'Start Screen Share'}</span>
                  <span className="show-mobile-only">{stream ? 'Stop' : 'Share'}</span>
                </button>
              ) : (
                <button 
                  className={`btn ${isMeInControl ? 'btn-secondary' : 'btn-primary'}`} 
                  onClick={requestControlAccess}
                  disabled={currentController && !isMeInControl}
                  style={{ paddingInline: '0.75rem' }}
                >
                  <Gamepad2 size={16} /> 
                  <span className="hide-mobile">
                    {isMeInControl ? 'Release Control' : currentController ? `${currentController.displayName} is in control` : 'Request Control'}
                  </span>
                  <span className="show-mobile-only">
                    {isMeInControl ? 'Release' : currentController ? 'Controlling' : 'Control'}
                  </span>
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
                style={{ padding: '0.4rem', color: showChat ? 'var(--color-primary)' : 'inherit' }} 
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
        {showChat && (
          <aside 
            className="glass chat-drawer slide-in-right" 
            style={{ 
              width: '340px', 
              borderLeft: '1px solid var(--border-default)', 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden',
              paddingTop: '60px',
            }}
          >
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <MessageSquare size={16} color="var(--text-secondary)" />
              <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Room Chat</h2>
            </div>
            <button 
              className="btn btn-ghost" 
              style={{ padding: '0.2rem', minWidth: 'auto', display: 'inline-flex', height: 'auto' }} 
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
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                    {msg.text}
                  </span>
                ) : (
                  <>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: msg.userId === userContext?.id ? 'var(--color-primary)' : 'var(--text-secondary)' }}>
                      {msg.displayName}
                    </span>
                    <div style={{ background: 'rgba(255,255,255,0.04)', padding: '0.5rem 0.75rem', borderRadius: '0 var(--radius-md) var(--radius-md) var(--radius-md)', fontSize: 'var(--text-sm)', width: 'fit-content', wordBreak: 'break-word', color: 'var(--text-primary)' }}>
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
            <div className="glass" style={{ padding: '0.5rem', display: 'flex', justifyItems: 'center', justifyContent: 'space-around', borderTop: '1px solid var(--border-default)' }}>
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
          <form onSubmit={handleSendChat} style={{ padding: '1rem', borderTop: '1px solid var(--border-default)', display: 'flex', gap: '0.5rem' }}>
            <button 
              type="button" 
              className="btn btn-ghost" 
              style={{ padding: '0.5rem' }}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile size={18} />
            </button>
            <input
              type="text"
              placeholder="Send message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="input-text"
              style={{ padding: '0.5rem 0.75rem', fontSize: 'var(--text-sm)' }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem' }}>
              <Send size={16} />
            </button>
          </form>

        </aside>
        )}

      </div>
    </div>
  );
}

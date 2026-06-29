// Agent: 🌐 Agent C (Viewer Screening Room Interface)
// File: packages/viewer/src/pages/Room.tsx

import React, { useState, useEffect, useRef } from 'react';
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
  Users,
  Smile,
  Send,
  MessageSquare,
  Copy,
  Check,
  Signal,
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

  // References
  const socketRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

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

    const socket = socketClient.connect();
    socketRef.current = socket;

    // Retrieve access token
    const token = localStorage.getItem('browsync_access_token') || undefined;

    // Join Socket Room
    socket.emit(SOCKET_EVENTS.ROOM_JOIN, {
      roomCode: roomCode.toUpperCase(),
      displayName: userContext?.displayName || `Guest_${Math.floor(Math.random() * 1000)}`,
      token,
    });

    // Listeners: Room joined confirmation (authoritative role assignment)
    socket.on(SOCKET_EVENTS.ROOM_JOINED, (payload: { role?: MemberRole; roomCode?: string }) => {
      if (payload?.roomCode && payload?.role) {
        console.log('🔑 Authoritative role from server:', payload.role);
        setRole(payload.role);
      }
    });

    // Listeners: Sync Room Members presences
    socket.on(SOCKET_EVENTS.PRESENCE_SYNC, (payload: { members: any[] }) => {
      setActiveMembers(payload.members);
    });

    // Listeners: Chat updates
    socket.on(SOCKET_EVENTS.CHAT_HISTORY, (payload: { messages: ChatMessage[] }) => {
      setChatMessages(payload.messages);
    });

    socket.on(SOCKET_EVENTS.CHAT_MESSAGE_RECEIVED, (message: ChatMessage) => {
      setChatMessages((prev) => [...prev, message]);
    });

    // Listeners: Ephemeral emoji reactions received
    socket.on(SOCKET_EVENTS.CHAT_REACTION_RECEIVED, (reaction: ChatReaction) => {
      const id = `${Date.now()}_${Math.random()}`;
      const drift = Math.floor(Math.random() * 80) - 40; // horizontal drift padding
      
      setFloatingEmojis((prev) => [...prev, { id, emoji: reaction.emoji, drift }]);
      
      // Auto-remove floating animation elements after 2 seconds
      setTimeout(() => {
        setFloatingEmojis((prev) => prev.filter((item) => item.id !== id));
      }, 2000);
    });

    // Listeners: Access controls granted
    socket.on(SOCKET_EVENTS.CONTROL_GRANTED, (payload: { grantedAt: number }) => {
      setCurrentController({
        userId: userContext?.id || socket.id,
        displayName: userContext?.displayName || 'You',
        grantedAt: payload.grantedAt,
      });
      setIsRequestingControl(false);
    });

    socket.on(SOCKET_EVENTS.CONTROL_DENIED, (payload: { reason: string }) => {
      alert(`Access Request Denied: ${payload.reason}`);
      setIsRequestingControl(false);
    });

    socket.on(SOCKET_EVENTS.CONTROL_REVOKED, (payload: { reason: string }) => {
      setCurrentController(null);
      alert(`Control access has been revoked: ${payload.reason}`);
    });

    socket.on(SOCKET_EVENTS.CONTROL_RELEASED, () => {
      setCurrentController(null);
    });

    socket.on(SOCKET_EVENTS.ROOM_CLOSED, (payload: { reason: string }) => {
      alert(`Session Closed: ${payload.reason}`);
      onNavigate('dashboard');
    });

    return () => {
      socket.emit(SOCKET_EVENTS.ROOM_LEAVE);
      socket.off(SOCKET_EVENTS.PRESENCE_SYNC);
      socket.off(SOCKET_EVENTS.CHAT_HISTORY);
      socket.off(SOCKET_EVENTS.CHAT_MESSAGE_RECEIVED);
      socket.off(SOCKET_EVENTS.CHAT_REACTION_RECEIVED);
      socket.off(SOCKET_EVENTS.CONTROL_GRANTED);
      socket.off(SOCKET_EVENTS.CONTROL_DENIED);
      socket.off(SOCKET_EVENTS.CONTROL_REVOKED);
      socket.off(SOCKET_EVENTS.CONTROL_RELEASED);
      socket.off(SOCKET_EVENTS.ROOM_CLOSED);
    };
  }, [loading, errorMsg, roomCode]);

  // Scroll to bottom of chat list
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // 3. WebRTC Hooks setup
  const [role, setRole] = useState<MemberRole>(
    roomInfo?.hostName && userContext?.displayName && roomInfo.hostName === userContext.displayName
      ? MemberRole.HOST
      : MemberRole.VIEWER
  );

  useEffect(() => {
    if (roomInfo?.hostName && userContext?.displayName) {
      if (roomInfo.hostName === userContext.displayName) {
        setRole(MemberRole.HOST);
      } else {
        setRole(MemberRole.VIEWER);
      }
    }
  }, [roomInfo, userContext]);

  const { stream, connectionState, sendInputEvent, startCapture, stopCapture } = useWebRTC({
    socket: socketRef.current,
    roomId: roomInfo?.id || null,
    role,
  });

  // Attach stream to video tag
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      if (role === MemberRole.HOST) {
        videoRef.current.muted = true;
      } else {
        videoRef.current.muted = false;
      }
    }
  }, [stream, role]);

  // 4. Coordinates Normalization Capture and Relay (P2P Remote Control)
  const isMeInControl = currentController?.userId === (userContext?.id || socketRef.current?.id);

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

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
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
      <header className="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border-default)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost" onClick={() => onNavigate('dashboard')} style={{ padding: '0.4rem 0.6rem' }}>✕ Leaving</button>
          <div>
            <h1 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>{roomInfo?.name}</h1>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Hosted by {roomInfo?.hostName}</span>
          </div>
        </div>

        {/* Invite link copying utility */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.04)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', letterSpacing: '0.5px' }}>
            CODE: {roomCode}
          </span>
          <button className="btn btn-secondary" onClick={handleCopyLink} style={{ padding: '0.25rem 0.75rem', fontSize: 'var(--text-xs)' }}>
            {copiedLink ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy Invite</>}
          </button>
        </div>
      </header>

      {/* Main split work area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* Left Side: Stream Viewer */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', background: '#02040e' }}>
          
          {/* Active control badge overlay */}
          {isMeInControl && (
            <div className="glass" style={{ position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', fontWeight: 'bold', zIndex: 10, display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--color-primary)' }}>
              <Gamepad2 size={12} color="var(--color-primary)" /> You are in control of the host browser
            </div>
          )}

          {/* Full Stream rendering area */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '1rem' }}>
            {stream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                tabIndex={0} // capture keyup/keydown events
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                className={isMeInControl ? 'glow-active' : ''}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  borderRadius: 'var(--radius-md)',
                  outline: 'none',
                  cursor: isMeInControl ? 'crosshair' : 'default',
                  border: isMeInControl ? '3px solid var(--color-primary)' : 'none',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
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
          <footer className="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {role === MemberRole.HOST ? (
                <button 
                  className={`btn ${stream ? 'btn-secondary' : 'btn-primary'}`} 
                  onClick={stream ? stopCapture : startCapture}
                  style={{ width: 'auto' }}
                >
                  📡 {stream ? 'Stop Screen Share' : 'Start Screen Share'}
                </button>
              ) : (
                <button 
                  className={`btn ${isMeInControl ? 'btn-secondary' : 'btn-primary'}`} 
                  onClick={requestControlAccess}
                  disabled={currentController && !isMeInControl}
                >
                  <Gamepad2 size={16} /> 
                  {isMeInControl ? 'Release Control' : currentController ? `${currentController.displayName} is in control` : 'Request Control'}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Users size={14} /> {activeMembers.length} Watching
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Signal size={14} color={connectionState === 'connected' ? 'var(--color-success)' : 'var(--color-warning)'} /> 
                Signal: {connectionState}
              </span>
              <button className="btn btn-ghost" style={{ padding: '0.4rem' }} onClick={() => videoRef.current?.requestFullscreen()}><Maximize2 size={16} /></button>
            </div>
          </footer>
        </div>

        {/* Right Side: Chat & Reaction Drawer */}
        <aside className="glass" style={{ width: '340px', borderLeft: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-default)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <MessageSquare size={16} color="var(--text-secondary)" />
            <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Room Chat</h2>
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

      </div>
    </div>
  );
}

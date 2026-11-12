import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../stores/auth';
import { sound } from '../lib/sound';
import { animate, stagger } from 'animejs';
import { 
  Radio, 
  Tv, 
  KeyRound, 
  Users, 
  Sparkles, 
  Copy, 
  Check, 
  ArrowRight, 
  Clock, 
  Lock, 
  Globe, 
  Trash2, 
  Play, 
  Layers
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (page: 'landing' | 'dashboard' | 'room', contextCode?: string) => void;
  userContext: any;
  setAuthContext?: (user: any | null) => void;
}

export function Dashboard({ onNavigate, userContext, setAuthContext: _setAuthContext }: DashboardProps) {
  const { logout } = useAuthStore();
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Workbench Mode: 'create' | 'join' | 'rooms' (mobile zero-scroll)
  const [workbenchTab, setWorkbenchTab] = useState<'create' | 'join' | 'rooms'>('create');

  // Create Stream Form inputs
  const [roomName, setRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [qualityPreset, setQualityPreset] = useState<'FHD_1080' | 'AUTO'>('FHD_1080');
  const [capacity, setCapacity] = useState(12);
  const [creationError, setCreationError] = useState('');
  const [creationLoading, setCreationLoading] = useState(false);

  // Join Room Code input
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  // Newly created room modal / banner
  const [createdRoom, setCreatedRoom] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const workbenchRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  // Stagger entrance with Anime.js
  useEffect(() => {
    try {
      animate('.spatial-hud-reveal', {
        translateY: [24, 0],
        opacity: [0, 1],
        delay: stagger(80, { start: 100 }),
        ease: 'out(3)',
        duration: 700,
      });
    } catch (_) {}
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await api.get('/api/rooms/my/history?page=1&limit=100');
      setHistory(data.rooms || []);
    } catch (err) {
      console.error('Failed to load room history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Handle Create Stream
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreationError('');
    setCreationLoading(true);
    sound.thud();

    try {
      await api.get('/api/auth/me');

      const data = await api.post('/api/rooms', {
        name: roomName || `${userContext?.displayName || 'Host'}'s Watch Party 🍿`,
        isPrivate,
        qualityPreset,
      });

      setCreatedRoom(data);
      sound.chime();
      fetchHistory();
    } catch (err: any) {
      if (err?.error?.code === 'UNAUTHORIZED' || err?.error?.code === 'SESSION_EXPIRED') {
        await logout().catch(() => {});
        onNavigate('landing');
        return;
      }
      setCreationError(err?.error?.message || err?.message || 'Failed to initialize broadcast room.');
    } finally {
      setCreationLoading(false);
    }
  };

  // Handle Direct Join via Room Code in the creation menu
  const handleDirectJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) return;

    setJoinError('');
    setJoinLoading(true);
    sound.click();

    try {
      const res = await api.get(`/api/rooms/${cleanCode}`);
      if (res?.room || res?.id || res?.roomCode) {
        sound.chime();
        onNavigate('room', cleanCode);
      } else {
        setJoinError('Room not found. Check the code and try again.');
      }
    } catch (err: any) {
      if (cleanCode.length >= 4) {
        sound.click();
        onNavigate('room', cleanCode);
      } else {
        setJoinError(err?.error?.message || 'Invalid or closed room code.');
      }
    } finally {
      setJoinLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (createdRoom) {
      const joinUrl = `${window.location.origin}/room/${createdRoom.roomCode}`;
      navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      sound.click();
      setTimeout(() => setCopiedLink(false), 2200);
    }
  };

  const handleCloseRoom = async (roomId: string) => {
    if (!window.confirm('End and archive this stream session? Connected friends will disconnect.')) return;
    try {
      sound.click();
      await api.patch(`/api/rooms/${roomId}/close`);
      fetchHistory();
    } catch (err) {
      console.error('Failed to close room:', err);
    }
  };

  return (
    <div 
      className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-12 sm:pb-20 flex flex-col gap-5 sm:gap-10"
      style={{
        paddingTop: 'max(4.5rem, calc(env(safe-area-inset-top, 0px) + 3.5rem))',
        paddingBottom: 'max(2rem, calc(env(safe-area-inset-bottom, 0px) + 2rem))',
      }}
    >
      
      {/* ── Top Hero HUD ── */}
      <section className="spatial-hud-reveal flex flex-col md:flex-row md:items-end justify-between gap-2 sm:gap-6 pb-2 border-b border-white/[0.06] shrink-0">
        <div className="flex flex-col gap-1 sm:gap-2">
          <h1 className="text-xl sm:text-3xl font-semibold tracking-tight text-white">
            Welcome, {userContext?.displayName || 'Friend'}
          </h1>
          <p className="text-[11px] sm:text-sm text-white/55 max-w-md">
            Watch videos, browse together, and hang out with friends in real-time.
          </p>
        </div>
      </section>

      {/* ── Newly Created Room Ready Modal/Banner ── */}
      {createdRoom && (
        <section className="spatial-hud-reveal p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-amber-950/30 backdrop-blur-2xl border border-amber-500/30 shadow-[0_16px_50px_rgba(245,158,11,0.15)] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-6 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 shrink-0">
              <Radio className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-[11px] font-mono text-amber-300">ROOM READY</span>
              <h3 className="text-sm sm:text-lg font-semibold text-white tracking-tight">{createdRoom.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] sm:text-[11px] font-mono text-white/60">CODE:</span>
                <span className="text-xs sm:text-sm font-mono font-bold tracking-widest text-amber-300 bg-white/[0.06] px-2 py-0.5 rounded-lg border border-white/10">
                  {createdRoom.roomCode}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-row items-center gap-2 sm:gap-3 w-full md:w-auto">
            <button
              onClick={handleCopyLink}
              className="flex-1 min-h-[38px] sm:min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-medium border border-white/10 transition-all active:scale-95"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white/70" />}
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={() => {
                sound.thud();
                onNavigate('room', createdRoom.roomCode);
              }}
              className="flex-1 min-h-[38px] sm:min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-black text-xs font-semibold shadow-md transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Enter</span>
            </button>
          </div>
        </section>
      )}

      {/* ── Main Spatial Workbench (Create Stream OR Join with Code) ── */}
      <section 
        ref={workbenchRef}
        className="spatial-hud-reveal rounded-2xl sm:rounded-3xl bg-[#0d0e16]/80 backdrop-blur-2xl border border-white/[0.09] shadow-[0_20px_60px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.12)] p-4 sm:p-8 flex flex-col gap-5 sm:gap-6"
      >
        {/* Spatial Segmented Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.06] pb-2.5 sm:pb-4 gap-2 shrink-0">
          {/* Mobile 3-Tab Switcher */}
          <div className="grid grid-cols-3 sm:hidden w-full gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
            <button
              type="button"
              onClick={() => {
                sound.click();
                setWorkbenchTab('create');
              }}
              className={`
                min-h-[36px] flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-medium transition-all
                ${workbenchTab === 'create' 
                  ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]' 
                  : 'text-white/60 hover:text-white'}
              `}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Host</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.click();
                setWorkbenchTab('join');
              }}
              className={`
                min-h-[36px] flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-medium transition-all
                ${workbenchTab === 'join' 
                  ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]' 
                  : 'text-white/60 hover:text-white'}
              `}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Join</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.click();
                setWorkbenchTab('rooms');
              }}
              className={`
                min-h-[36px] flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-medium transition-all
                ${workbenchTab === 'rooms' 
                  ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]' 
                  : 'text-white/60 hover:text-white'}
              `}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Rooms ({history.length})</span>
            </button>
          </div>

          {/* Desktop 2-Tab Switcher */}
          <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
            <button
              type="button"
              onClick={() => {
                sound.click();
                setWorkbenchTab('create');
              }}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all
                ${workbenchTab === 'create' 
                  ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]' 
                  : 'text-white/60 hover:text-white hover:bg-white/[0.03]'}
              `}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Host New Stream</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.click();
                setWorkbenchTab('join');
              }}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all
                ${workbenchTab === 'join' 
                  ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]' 
                  : 'text-white/60 hover:text-white hover:bg-white/[0.03]'}
              `}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Join via Room Code</span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-white/40 hidden sm:inline-block">
            {workbenchTab === 'create' ? 'Host a Stream' : 'Join Friends'}
          </span>
        </div>

        {/* TAB 1: HOST NEW STREAM */}
        {workbenchTab === 'create' && (
          <form onSubmit={handleCreateRoom} className="flex flex-col gap-6">
            {creationError && (
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                {creationError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Stream Title */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono uppercase tracking-wider text-amber-200/60">
                  Room Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. YouTube Watch Party / Gaming"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-4 py-3.5 sm:py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-base sm:text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-400/80 focus:bg-white/[0.06] transition-all"
                />
              </div>

              {/* Stream Quality Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono uppercase tracking-wider text-amber-200/60">
                  Stream Quality
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      sound.click();
                      setQualityPreset('FHD_1080');
                    }}
                    className={`
                      min-h-[52px] p-2.5 rounded-2xl border text-left flex flex-col justify-center gap-0.5 transition-all
                      ${qualityPreset === 'FHD_1080' 
                        ? 'bg-amber-500/10 border-amber-400/40 text-amber-200' 
                        : 'bg-white/[0.02] border-white/10 text-white/60 hover:border-white/20'}
                    `}
                  >
                    <span className="text-xs font-semibold">High Definition</span>
                    <span className="text-[10px] text-white/40">Best video & audio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sound.click();
                      setQualityPreset('AUTO');
                    }}
                    className={`
                      min-h-[52px] p-2.5 rounded-2xl border text-left flex flex-col justify-center gap-0.5 transition-all
                      ${qualityPreset === 'AUTO' 
                        ? 'bg-amber-500/10 border-amber-400/40 text-amber-200' 
                        : 'bg-white/[0.02] border-white/10 text-white/60 hover:border-white/20'}
                    `}
                  >
                    <span className="text-xs font-semibold">Balanced</span>
                    <span className="text-[10px] text-white/40">Data friendly</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Slider & Privacy Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              {/* Capacity Slider */}
              <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono text-white/50 uppercase tracking-wider">Friend Capacity</span>
                  <span className="font-mono font-bold text-amber-300">{capacity} Viewers</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={24}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Privacy Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/[0.04] text-white/70">
                    {isPrivate ? <Lock className="w-4 h-4 text-amber-400" /> : <Globe className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-white">{isPrivate ? 'Private Room' : 'Public Room'}</span>
                    <span className="text-[11px] text-white/40">{isPrivate ? 'Only friends with link or code' : 'Anyone with link can join'}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sound.click();
                    setIsPrivate(!isPrivate);
                  }}
                  className={`
                    w-12 h-6 flex items-center rounded-full p-1 transition-colors
                    ${isPrivate ? 'bg-amber-500/30 border border-amber-500/50 justify-end' : 'bg-white/10 border border-white/15 justify-start'}
                  `}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={creationLoading}
              className="mt-2 w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-black font-semibold text-sm tracking-wide shadow-[0_4px_30px_rgba(245,158,11,0.35)] transition-all duration-300 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creationLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Setting up room...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-black" />
                  <span>Create Watch Room</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 2: JOIN VIA ROOM CODE (NEWLY INTEGRATED) */}
        {workbenchTab === 'join' && (
          <form onSubmit={handleDirectJoin} className="flex flex-col gap-6 py-2">
            {joinError && (
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                {joinError}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono uppercase tracking-wider text-amber-200/60">
                Enter 6-Character Room Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={8}
                  autoFocus
                  required
                  placeholder="e.g. 7K9X2M"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full px-4 sm:px-5 py-3.5 sm:py-4 rounded-2xl bg-white/[0.04] border border-white/10 text-lg sm:text-xl font-mono tracking-[0.25em] text-amber-300 placeholder-white/20 focus:outline-none focus:border-amber-400/80 focus:bg-white/[0.06] transition-all uppercase"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) {
                        sound.click();
                        const match = text.match(/([A-Za-z0-9]{6})/);
                        setJoinCode(match ? match[1].toUpperCase() : text.trim().slice(0, 6).toUpperCase());
                      }
                    } catch (_) {}
                  }}
                  className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 min-h-[36px] px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-mono text-white/70 hover:text-white transition-colors"
                >
                  Paste
                </button>
              </div>
              <span className="text-[11px] text-white/40">
                Paste the 6-character code your friend shared to join their stream instantly.
              </span>
            </div>

            <button
              type="submit"
              disabled={joinLoading || !joinCode.trim()}
              className="w-full min-h-[48px] py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-black font-semibold text-sm tracking-wide shadow-[0_4px_30px_rgba(16,185,129,0.35)] transition-all duration-300 active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {joinLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  <span>Join Room</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 3 (MOBILE ONLY): ACTIVE ROOMS & SESSIONS (ZERO-SCROLL VIEWPORT) */}
        {workbenchTab === 'rooms' && (
          <div className="flex flex-col gap-2.5 max-h-[46dvh] overflow-y-auto pr-1">
            {loadingHistory ? (
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/40 text-xs font-mono">
                Scanning active rooms...
              </div>
            ) : history.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex flex-col items-center justify-center gap-2 text-center">
                <Radio className="w-6 h-6 text-white/20" />
                <p className="text-xs text-white/60">No active rooms found</p>
                <span className="text-[10px] text-white/40">Switch to Host tab above to start your stream.</span>
              </div>
            ) : (
              history.map((room) => {
                const isClosed = room.status === 'CLOSED';
                return (
                  <div
                    key={room.id}
                    className="p-3.5 rounded-xl bg-[#0d0e16]/60 border border-white/[0.07] flex items-center justify-between gap-2"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isClosed ? 'bg-white/30' : 'bg-amber-400 animate-pulse'}`} />
                        <span className="text-[10px] font-mono text-white/40">{isClosed ? 'ARCHIVED' : 'LIVE'}</span>
                      </div>
                      <span className="text-xs font-semibold text-white truncate">{room.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950/40 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                        {room.roomCode}
                      </span>
                      <button
                        onClick={() => {
                          sound.click();
                          onNavigate('room', room.roomCode);
                        }}
                        className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 text-xs font-medium active:scale-95"
                      >
                        Enter
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>

      {/* ── Active Rooms & History Grid (Desktop Only - On mobile it lives in Tab 3 with Zero Scroll) ── */}
      <section className="hidden md:flex spatial-hud-reveal flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-medium text-white tracking-tight">Active Rooms & Watch History</h2>
          </div>
          <span className="text-xs font-mono text-white/40">{history.length} Total Sessions</span>
        </div>

        {loadingHistory ? (
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/40 text-xs font-mono">
            Scanning active rooms...
          </div>
        ) : history.length === 0 ? (
          <div className="p-10 rounded-3xl bg-white/[0.02] border border-white/[0.05] flex flex-col items-center justify-center gap-2 text-center">
            <Radio className="w-8 h-8 text-white/20" />
            <p className="text-sm text-white/60">No active rooms found</p>
            <span className="text-xs text-white/40">Create a room above or join with a friend's code.</span>
          </div>
        ) : (
          <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {history.map((room) => {
              const isClosed = room.status === 'CLOSED';
              return (
                <div
                  key={room.id}
                  className="p-5 rounded-2xl bg-[#0d0e16]/60 backdrop-blur-xl border border-white/[0.07] hover:border-amber-500/25 shadow-lg transition-all flex flex-col justify-between gap-4 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`
                            w-2 h-2 rounded-full
                            ${isClosed ? 'bg-white/30' : 'bg-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]'}
                          `}
                        />
                        <span className="text-xs font-mono text-white/40">
                          {isClosed ? 'ARCHIVED' : 'LIVE WITH FRIENDS'}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-white tracking-tight group-hover:text-amber-300 transition-colors">
                        {room.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950/40 border border-amber-500/20 px-2.5 py-1 rounded-xl">
                        {room.roomCode}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-xs text-white/40">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-amber-400/80" />
                        <span>{room.viewerCount || 1}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(room.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isClosed && (
                        <button
                          onClick={() => handleCloseRoom(room.id)}
                          title="Close Session"
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center p-2 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors active:scale-90"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          sound.click();
                          onNavigate('room', room.roomCode);
                        }}
                        className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-amber-500/20 text-white/90 hover:text-amber-200 border border-white/10 hover:border-amber-500/30 text-xs font-medium transition-all active:scale-95"
                      >
                        {isClosed ? 'View Logs' : 'Enter Room'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}

import React, { useState } from 'react';
import { sound } from '../lib/sound';
import { Radio, Users, LogOut, LayoutGrid, KeyRound, ArrowRight } from 'lucide-react';

interface DynamicIslandProps {
  currentView: 'landing' | 'dashboard' | 'room';
  onNavigate: (view: 'landing' | 'dashboard' | 'room') => void;
  user?: { email?: string; displayName?: string } | null;
  onLogout?: () => void;
  roomCode?: string;
  memberCount?: number;
  onQuickJoin?: (code: string) => void;
}

export const DynamicIsland: React.FC<DynamicIslandProps> = ({
  currentView,
  onNavigate,
  user,
  onLogout,
  roomCode,
  memberCount,
  onQuickJoin,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [showJoinPrompt, setShowJoinPrompt] = useState(false);

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim() || !onQuickJoin) return;
    sound.thud();
    onQuickJoin(joinCodeInput.trim().toUpperCase());
    setShowJoinPrompt(false);
    setJoinCodeInput('');
  };

  return (
    <header 
      className="fixed left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-[calc(100vw-1.5rem)]"
      style={{ top: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))' }}
    >
      <div
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => {
          if (!showJoinPrompt) setIsExpanded(false);
        }}
        className={`
          relative flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-2 rounded-full
          bg-[#0d0e16]/90 backdrop-blur-2xl
          border border-white/[0.09] shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.12)]
          transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${isExpanded ? 'scale-[1.02] shadow-[0_12px_40px_rgba(245,158,11,0.18)] border-amber-500/25' : 'scale-100'}
        `}
      >
        {/* Glowing Brand Pulse - Warm Golden Hour */}
        <button
          onClick={() => {
            sound.click();
            onNavigate(user ? 'dashboard' : 'landing');
          }}
          className="flex items-center gap-2 text-xs font-mono tracking-tight text-white/90 hover:text-white transition-colors group"
        >
          <img
            src="/logos/brosync-emblem.png"
            alt="BroSync"
            className="w-4 h-4 object-contain filter drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] group-hover:scale-110 transition-transform"
          />
          <span className="font-semibold text-sm tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-300 to-rose-400">
            BroSync
          </span>
        </button>

        {/* In-Room Context (Only shown when actively inside a room) */}
        {currentView === 'room' && roomCode && (
          <>
            <div className="h-3.5 w-px bg-white/10" />
            <div className="flex items-center gap-2 text-xs font-mono text-amber-300 bg-amber-950/40 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
              <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
              <span>{roomCode}</span>
              {memberCount !== undefined && (
                <span className="flex items-center gap-1 text-white/60 text-[11px] ml-1">
                  <Users className="w-2.5 h-2.5" /> {memberCount}
                </span>
              )}
            </div>
          </>
        )}

        {/* Quick Actions in Island */}
        <div className="flex items-center gap-1.5">
          {user && currentView !== 'dashboard' && (
            <button
              onClick={() => {
                sound.click();
                onNavigate('dashboard');
              }}
              title="Dashboard"
              className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/[0.08] transition-all"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Quick Join Trigger */}
          {user && currentView === 'dashboard' && onQuickJoin && (
            <div className="relative">
              <button
                onClick={() => {
                  sound.click();
                  setShowJoinPrompt(!showJoinPrompt);
                }}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 hover:text-white border border-amber-500/20 transition-all active:scale-95"
              >
                <KeyRound className="w-3 h-3 text-amber-400" />
                <span>Join</span>
              </button>

              {showJoinPrompt && (
                <form
                  onSubmit={handleJoinSubmit}
                  className="absolute top-12 right-0 w-[calc(100vw-3rem)] max-w-xs p-3.5 rounded-2xl bg-[#0d0e16]/95 backdrop-blur-3xl border border-amber-500/20 shadow-2xl flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200"
                >
                  <label className="text-[11px] font-mono uppercase tracking-wider text-amber-200/60">
                    Enter 6-Digit Code
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      autoFocus
                      maxLength={8}
                      placeholder="e.g. BR-8821"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      className="w-full bg-white/[0.04] border border-white/15 rounded-xl px-3 py-2 text-base font-mono tracking-widest text-amber-300 focus:outline-none focus:border-amber-400/80 transition-colors uppercase"
                    />
                    <button
                      type="submit"
                      disabled={!joinCodeInput.trim()}
                      className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-semibold disabled:opacity-40 transition-all active:scale-90 shrink-0"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {user && onLogout && (
            <button
              onClick={() => {
                sound.click();
                onLogout();
              }}
              title="Sign Out"
              className="p-1.5 rounded-full text-white/50 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

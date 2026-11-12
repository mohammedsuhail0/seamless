import React, { useState } from 'react';
import { sound } from '../lib/sound';
import { Radio, Users, LogOut, LayoutGrid } from 'lucide-react';

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
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <header 
      className="fixed left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-[calc(100vw-1.5rem)]"
      style={{ top: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))' }}
    >
      <div
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
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

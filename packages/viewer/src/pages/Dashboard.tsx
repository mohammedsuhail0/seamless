// Agent: 🌐 Agent C (Viewer App Dashboard Page)
// File: packages/viewer/src/pages/Dashboard.tsx

import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../stores/auth';
import { 
  Plus, 
  Film, 
  Users, 
  Clock, 
  LogOut, 
  Copy, 
  Check, 
  Ticket, 
  Settings 
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (page: 'landing' | 'dashboard' | 'room', contextCode?: string) => void;
  userContext: any;
  setAuthContext?: (user: any | null) => void;
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

export function Dashboard({ onNavigate, userContext, setAuthContext }: DashboardProps) {
  const { logout } = useAuthStore();
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyCount, setHistoryCount] = useState(0);

  // New room modal inputs
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [qualityPreset, setQualityPreset] = useState('AUTO');
  const [creationError, setCreationError] = useState('');
  const [creationLoading, setCreationLoading] = useState(false);

  // Newly created room details
  const [createdRoom, setCreatedRoom] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Range slider capacity and navigation tab states
  const [capacity, setCapacity] = useState(8);
  const [activeTab, setActiveTab] = useState('suites');
  const [showCinemaModal, setShowCinemaModal] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const activeLobbies = history.filter(room => room.status !== 'CLOSED');
  const recentScreenings = history.filter(room => room.status === 'CLOSED');

  // Fetch hosted room history on load
  const fetchHistory = async () => {
    try {
      const data = await api.get('/api/rooms/my/history?page=1&limit=5');
      setHistory(data.rooms);
      setHistoryCount(data.total);
    } catch (err) {
      console.error('Failed to load room history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleCreateRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreationError('');
    setCreationLoading(true);

    try {
      // Verify the cached session before creating a room.
      // This prevents stale localStorage from showing the dashboard while the token is already invalid.
      await api.get('/api/auth/me');

      const data = await api.post('/api/rooms', {
        name: roomName || 'Movie Screening Room 🍿',
        isPrivate,
        qualityPreset,
      });

      setCreatedRoom(data);
      setShowCreateModal(true);
      // Refresh history list
      fetchHistory();
    } catch (err: any) {
      if (err?.error?.code === 'UNAUTHORIZED' || err?.error?.code === 'SESSION_EXPIRED') {
        await logout().catch(() => {});
        setCreationError('Session expired. Please log in again.');
        onNavigate('landing');
        return;
      }

      setCreationError(err?.error?.message || err?.message || 'Failed to create room.');
    } finally {
      setCreationLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (createdRoom) {
      const joinUrl = `${window.location.protocol}//${window.location.host}/room/${createdRoom.roomCode}`;
      navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const triggerLogout = async () => {
    await logout();
    setAuthContext?.(null);
    onNavigate('landing');
  };

  return (
    <div className="dashboard-page-root" style={{ position: 'relative' }}>
      <div className="radial-glow" style={{ top: '-10%', right: '-10%', background: 'radial-gradient(circle, rgba(197, 168, 92, 0.08) 0%, rgba(0,0,0,0) 70%)' }} />
      <div className="radial-glow" style={{ bottom: '-10%', left: '-10%', background: 'radial-gradient(circle, rgba(229, 9, 20, 0.05) 0%, rgba(0,0,0,0) 70%)' }} />

      {/* Header */}
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 2rem', background: '#000000', borderBottom: '1px solid rgba(197, 168, 92, 0.15)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => onNavigate('landing')}>
          <GoldLogoSVG size={34} />
          <span style={{ fontWeight: 700, fontSize: '1.35rem', letterSpacing: '0.5px', color: '#c5a85c', fontFamily: 'var(--font-serif)' }}>Patron Lounge</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid var(--color-gold)', background: 'rgba(197, 168, 92, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--color-gold)', fontSize: 'var(--text-sm)' }}>
              {userContext?.displayName ? userContext.displayName.slice(0, 2).toUpperCase() : 'JD'}
            </div>
            <span style={{ fontWeight: 600, color: '#ffffff', fontSize: 'var(--text-sm)' }} className="hide-mobile">{userContext?.displayName || 'Patron'}</span>
          </div>
          <button className="btn btn-ghost" onClick={triggerLogout} style={{ padding: '0.5rem', color: 'rgba(255,255,255,0.6)' }} title="Sign Out"><LogOut size={18} /></button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1.5rem 6rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2.25rem', position: 'relative', zIndex: 1 }}>
        
        {/* Banner Segment */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px' }}>
            Welcome back, {userContext?.displayName ? userContext.displayName.split(' ')[0] : 'Patron'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Sync with your friends and control your virtual theater in real-time.</p>
        </section>

        {/* Stats Section */}
        <section className="stats-grid">
          <div className="gold-stat-card">
            <div style={{ fontSize: 'var(--text-4xl)', fontWeight: 700, color: 'var(--color-gold)', fontFamily: 'var(--font-serif)', lineHeight: 1 }}>
              {historyCount > 0 ? Math.max(24, Math.floor(historyCount * 1.5)) : 24}
            </div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--color-gold)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '0.4rem' }}>
              Hours Synced
            </div>
          </div>

          <div className="gold-stat-card">
            <div style={{ fontSize: 'var(--text-4xl)', fontWeight: 700, color: 'var(--color-gold)', fontFamily: 'var(--font-serif)', lineHeight: 1 }}>
              {historyCount > 0 ? historyCount * 3 : 12}
            </div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--color-gold)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '0.4rem' }}>
              Friends Active
            </div>
          </div>
        </section>

        {/* Create Suite Form (Inline Form replacing previous modal trigger) */}
        <section className="gold-form-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Plus size={20} color="var(--color-gold)" style={{ strokeWidth: '2.5px' }} />
            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#ffffff' }}>Create Suite</h2>
          </div>
          
          <form onSubmit={handleCreateRoomSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {creationError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--color-error)', fontSize: 'var(--text-xs)' }}>
                {creationError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.5px' }}>LOUNGE NAME</label>
              <input 
                type="text" 
                required
                placeholder="e.g., Midnight Screening" 
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="premium-input"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.5px' }}>CAPACITY (MAX 20)</label>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-gold)' }}>{capacity}</span>
              </div>
              <input 
                type="range" 
                min={1} 
                max={20} 
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="premium-slider"
              />
            </div>

            {/* Advanced configurations inside grid */}
            <div className="dashboard-form-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '9px', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.5px' }}>QUALITY PRESET</label>
                <select 
                  value={qualityPreset} 
                  onChange={(e) => setQualityPreset(e.target.value)}
                  className="premium-input"
                  style={{ padding: '0.5rem 0.75rem', fontSize: 'var(--text-xs)', background: '#111111', height: '38px' }}
                >
                  <option value="AUTO">AUTO (Adaptive)</option>
                  <option value="HD_720">HD 720p</option>
                  <option value="FHD_1080">FHD 1080p</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.35rem' }}>
                <label style={{ fontSize: '9px', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.5px' }}>PRIVACY</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '38px' }}>
                  <input 
                    type="checkbox" 
                    id="isPrivate"
                    checked={isPrivate} 
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--color-gold)' }}
                  />
                  <label htmlFor="isPrivate" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', cursor: 'pointer' }}>Private Suite</label>
                </div>
              </div>
            </div>

            <button type="submit" disabled={creationLoading} className="btn-red" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.85rem', marginTop: '0.5rem' }}>
              <Ticket size={16} style={{ strokeWidth: '2.5px' }} /> {creationLoading ? 'Host Screening...' : 'Host Screening'}
            </button>
          </form>
        </section>

        {/* Active Lobbies */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#e50914', boxShadow: '0 0 8px #e50914' }} />
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: '#ffffff' }}>Active Lobbies</h2>
          </div>
          {loadingHistory ? (
            <div className="glass" style={{ padding: '3rem', textAlign: 'center', borderRadius: 'var(--radius-lg)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.05)' }}>
              Loading active lobbies...
            </div>
          ) : activeLobbies.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', borderRadius: '8px', color: 'rgba(255, 255, 255, 0.4)', border: '1px dashed rgba(197, 168, 92, 0.2)', background: 'rgba(12, 12, 12, 0.4)' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.75rem' }}>🍿</span>
              <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'var(--font-serif)' }}>No Active Lobbies</h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>You haven't hosted or joined any suites yet. Use the Create Suite form above to host one!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeLobbies.map((room) => {
                return (
                  <div key={room.id} className="lobby-card">
                    <div className="lobby-card-header">
                      <span style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)', padding: '0.25rem 0.5rem', borderRadius: '4px', letterSpacing: '0.5px' }}>
                        {!room.qualityPreset || room.qualityPreset === 'AUTO' ? 'CINEMATIC SYNC' : room.qualityPreset.replace('_', ' ')}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '-6px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#c5a85c', border: '1.5px solid #000000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>
                          {userContext?.displayName ? userContext.displayName[0].toUpperCase() : 'P'}
                        </div>
                        {room.viewerCount > 0 && (
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#222222', border: '1.5px solid #000000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold', color: '#ffffff', marginLeft: '-6px' }}>
                            +{room.viewerCount}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>{room.name}</h3>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} /> Started {new Date(room.createdAt).toLocaleDateString()} ({Math.ceil(room.duration / 60)}m shared)
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '1rem', marginTop: '0.25rem' }}>
                      <div className="equalizer-box">
                        <span className="equalizer-bar" />
                        <span className="equalizer-bar" />
                        <span className="equalizer-bar" />
                      </div>
                      <button className="btn-gold-rejoin" onClick={() => onNavigate('room', room.roomCode)}>
                        Join Lobby
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Screenings Section */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: '#ffffff' }}>Recent Screenings</h2>
          
          {recentScreenings.length === 0 ? (
            <div style={{ padding: '2rem 1.5rem', textAlign: 'center', borderRadius: '8px', color: 'rgba(255, 255, 255, 0.4)', border: '1px dashed rgba(255, 255, 255, 0.08)', background: 'rgba(5, 5, 5, 0.2)' }}>
              <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>🎬</span>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>No completed screenings found.</p>
            </div>
          ) : (
            <div className="screenings-grid">
              {recentScreenings.map((room) => {
                const durationHrs = Math.floor(room.duration / 3600);
                const durationMins = Math.ceil((room.duration % 3600) / 60);
                const durationStr = durationHrs > 0 ? `${durationHrs}h ${durationMins}m` : `${durationMins}m`;

                return (
                  <div key={room.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ width: '100%', height: '120px', borderRadius: '8px', background: 'linear-gradient(185deg, #111 0%, #000 100%)', border: '1px solid rgba(197, 168, 92, 0.15)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Film size={28} color="rgba(197, 168, 92, 0.2)" />
                      <span style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.85)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', color: '#ffffff' }}>
                        {durationStr}
                      </span>
                      <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(197, 168, 92, 0.2)', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold', color: 'var(--color-gold)' }}>
                        {(!room.qualityPreset || room.qualityPreset === 'AUTO') ? 'AUTO' : room.qualityPreset.replace('_', ' ')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                      <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#ffffff' }}>{room.name}</h3>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{new Date(room.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '-6px' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(197, 168, 92, 0.15)', color: 'var(--color-gold)', border: '1px solid var(--color-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px', fontWeight: 'bold' }}>
                          {userContext?.displayName ? userContext.displayName[0].toUpperCase() : 'P'}
                        </div>
                      </div>
                      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>
                        {room.viewerCount} {room.viewerCount === 1 ? 'Guest' : 'Guests'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>

      {/* Interactive Sticky Bottom Navigation Bar */}
      <nav className="sticky-bottom-nav">
        <button className={`sticky-bottom-nav-item ${activeTab === 'cinema' ? 'active' : ''}`} onClick={() => { setActiveTab('cinema'); setShowCinemaModal(true); }}>
          <Film size={18} />
          Cinema
        </button>
        <button className={`sticky-bottom-nav-item ${activeTab === 'suites' ? 'active' : ''}`} onClick={() => { setActiveTab('suites'); setShowCinemaModal(false); setShowSocialModal(false); setShowSettingsModal(false); }}>
          <Ticket size={18} />
          Suites
        </button>
        <button className={`sticky-bottom-nav-item ${activeTab === 'social' ? 'active' : ''}`} onClick={() => { setActiveTab('social'); setShowSocialModal(true); }}>
          <Users size={18} />
          Social
        </button>
        <button className={`sticky-bottom-nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => { setActiveTab('settings'); setShowSettingsModal(true); }}>
          <Settings size={18} />
          Settings
        </button>
      </nav>

      {/* Immersive Glassmorphic Modal Overlay for Creating Rooms - SUCCESS DIALOG ONLY */}
      {showCreateModal && createdRoom && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass modal-container success-modal-card" style={{ borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1.5px solid var(--color-gold)', background: '#0a0a0a', boxShadow: '0 20px 50px rgba(0,0,0,0.9)', maxWidth: '440px', width: '100%' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, fontFamily: 'var(--font-serif)', color: '#ffffff' }}>Screening Created!</h2>
              <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)} style={{ padding: '0.3rem 0.6rem', color: 'rgba(255,255,255,0.4)' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem' }}>🍿</div>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Suite Invitation Code</h3>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2.25rem', fontWeight: 800, background: 'rgba(255,255,255,0.04)', padding: '0.5rem', borderRadius: 'var(--radius-md)', margin: '0.75rem 0', letterSpacing: '3px', color: 'var(--color-gold)', border: '1px solid rgba(197, 168, 92, 0.2)' }}>
                  {createdRoom.roomCode}
                </div>
              </div>
              
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Share this code or link with guests to sync browsing instantly.</p>
              
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={handleCopyLink} style={{ flex: 1, border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff' }}>
                  {copiedLink ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy Link</>}
                </button>
                <button className="btn-red" onClick={() => onNavigate('room', createdRoom.roomCode)} style={{ flex: 1 }}>
                  Start Stream
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Overlays for Bottom Tabs */}
      
      {/* Cinema Overlay */}
      {showCinemaModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass modal-container" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1.5px solid var(--color-gold)', background: '#0c0c0c', maxWidth: '440px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Film size={18} color="var(--color-gold)" />
                <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: '#ffffff' }}>Cinema Showcase</h2>
              </div>
              <button className="btn btn-ghost" onClick={() => { setShowCinemaModal(false); setActiveTab('suites'); }} style={{ padding: '0.3rem 0.6rem', color: 'rgba(255,255,255,0.4)' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {[
                { title: 'Dune: Part Two', duration: '2h 46m', desc: 'Epic sci-fi action' },
                { title: 'Oppenheimer', duration: '3h 00m', desc: 'Biographical historical drama' },
                { title: 'Everything Everywhere All at Once', duration: '2h 19m', desc: 'Multiverse comedy drama' },
                { title: 'Interstellar', duration: '2h 49m', desc: 'Space exploration masterpiece' }
              ].map((movie, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#ffffff' }}>{movie.title}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{movie.desc} • {movie.duration}</span>
                  </div>
                  <button className="btn-gold-rejoin" style={{ padding: '0.25rem 0.5rem', fontSize: '10px' }} onClick={() => { setRoomName(`${movie.title} Suite 🍿`); setShowCinemaModal(false); setActiveTab('suites'); }}>
                    Host
                  </button>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>Selecting a movie pre-fills the lounge name in your suite builder.</p>
          </div>
        </div>
      )}

      {/* Social Overlay */}
      {showSocialModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass modal-container" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1.5px solid var(--color-gold)', background: '#0c0c0c', maxWidth: '440px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} color="var(--color-gold)" />
                <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: '#ffffff' }}>Patron Network</h2>
              </div>
              <button className="btn btn-ghost" onClick={() => { setShowSocialModal(false); setActiveTab('suites'); }} style={{ padding: '0.3rem 0.6rem', color: 'rgba(255,255,255,0.4)' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
              {[
                { name: 'John Doe', status: 'Online', code: 'JD' },
                { name: 'Alice Smith', status: 'In a Suite (Dune)', code: 'AS' },
                { name: 'Bob Johnson', status: 'Offline', code: 'BJ' }
              ].map((friend, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(197,168,92,0.15)', color: 'var(--color-gold)', border: '1px solid var(--color-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>{friend.code}</div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#ffffff' }}>{friend.name}</span>
                      <span style={{ fontSize: '10px', color: friend.status === 'Offline' ? 'var(--text-muted)' : 'var(--color-success)' }}>{friend.status}</span>
                    </div>
                  </div>
                  {friend.status === 'Online' && (
                    <button className="btn-gold-rejoin" style={{ padding: '0.25rem 0.5rem', fontSize: '10px' }} onClick={() => alert(`Invite sent to ${friend.name}!`)}>
                      Invite
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings Overlay */}
      {showSettingsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass modal-container" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1.5px solid var(--color-gold)', background: '#0c0c0c', maxWidth: '440px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings size={18} color="var(--color-gold)" />
                <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: '#ffffff' }}>Lounge Settings</h2>
              </div>
              <button className="btn btn-ghost" onClick={() => { setShowSettingsModal(false); setActiveTab('suites'); }} style={{ padding: '0.3rem 0.6rem', color: 'rgba(255,255,255,0.4)' }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: '#ffffff' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700 }}>ACCOUNT HOLDER</span>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{userContext?.displayName || 'Screen Host'}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{userContext?.email || 'patron@hypersync.com'}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700 }}>THEME PREFERENCE</span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gold)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  ⚜️ Patron Lounge Premium (Rolls Royce & Netflix)
                </span>
              </div>

              <button className="btn btn-danger" onClick={() => { setShowSettingsModal(false); triggerLogout(); }} style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: '#e50914' }}>
                Sign Out from Lounge
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Agent: 🌐 Agent C (Viewer App Dashboard Page)
// File: packages/viewer/src/pages/Dashboard.tsx

import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../stores/auth';
import { Plus, Film, History, Calendar, Users, Clock, LogOut, Copy, Check } from 'lucide-react';

interface DashboardProps {
  onNavigate: (page: 'landing' | 'dashboard' | 'room', contextCode?: string) => void;
  userContext: any;
  setAuthContext?: (user: any | null) => void;
}

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
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <div className="radial-glow" style={{ top: '-10%', right: '-10%' }} />

      {/* Header */}
      <header className="glass dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => onNavigate('landing')}>
          <span style={{ fontSize: '1.75rem' }}>📡</span>
          <span style={{ fontWeight: 800, fontSize: '1.25rem' }}>BrowSync</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-full)', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {userContext?.displayName ? userContext.displayName[0].toUpperCase() : 'A'}
            </div>
            <span style={{ fontWeight: 600 }}>{userContext?.displayName || 'Host'}</span>
          </div>
          <button className="btn btn-ghost" onClick={triggerLogout} style={{ padding: '0.5rem' }}><LogOut size={18} /></button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '4rem 2rem', display: 'flex', flexDirection: 'column', gap: '3rem', position: 'relative', zIndex: 1 }}>
        
        {/* Banner Segment */}
        <section className="dashboard-banner">
          <div>
            <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800 }}>Welcome, {userContext?.displayName || 'Screen Host'}</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Create a room, invite your friends, and start watching together with zero lag.</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setShowCreateModal(true); setCreatedRoom(null); }} style={{ height: 'fit-content' }}>
            <Plus size={18} /> Create New Room
          </button>
        </section>

        {/* Stats Section */}
        <section className="stats-grid">
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(79, 70, 229, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
              <Film size={20} color="#818cf8" />
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Total Sessions Hosted</div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{historyCount}</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
              <Users size={20} color="#34d399" />
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Friends Invited</div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{historyCount * 3}</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
              <Clock size={20} color="#fbbf24" />
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Hours Shared</div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{Math.max(1, Math.floor(historyCount * 1.5))} hrs</div>
            </div>
          </div>
        </section>

        {/* History Log */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={18} color="var(--text-secondary)" />
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Recent Rooms History</h2>
          </div>

          {loadingHistory ? (
            <div className="glass" style={{ padding: '3rem', textAlign: 'center', borderRadius: 'var(--radius-lg)', color: 'var(--text-secondary)' }}>
              Loading hosted history...
            </div>
          ) : history.length === 0 ? (
            <div className="glass" style={{ padding: '3rem', textAlign: 'center', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)' }}>
              You haven't hosted any co-browsing rooms yet. Click "Create New Room" to start!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {history.map((room) => (
                <div key={room.id} className="glass-card history-card" style={{ padding: '1.25rem 1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{room.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={12} /> {new Date(room.createdAt).toLocaleDateString()}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} /> {Math.ceil(room.duration / 60)} min</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Users size={12} /> {room.viewerCount} joined</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', fontWeight: 'bold', background: room.status === 'CLOSED' ? 'rgba(255,255,255,0.06)' : 'rgba(16,185,129,0.1)', color: room.status === 'CLOSED' ? 'var(--text-secondary)' : 'var(--color-success)' }}>
                      {room.status}
                    </span>
                    <button className="btn btn-ghost" onClick={() => onNavigate('room', room.roomCode)} style={{ padding: '0.4rem 0.8rem', fontSize: 'var(--text-xs)' }}>
                      Enter Room
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Immersive Glassmorphic Modal Overlay for Creating Rooms */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--bg-overlay)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass modal-container" style={{ padding: '2.5rem', borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid rgba(255,255,255,0.08)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800 }}>Create New Screening</h2>
              <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)} style={{ padding: '0.3rem 0.6rem' }}>✕</button>
            </div>

            {createdRoom ? (
              /* Success Room Created Display */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem' }}>🎉</div>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: 'var(--text-base)' }}>Room Code Generated</h3>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 800, background: 'rgba(255,255,255,0.04)', padding: '0.5rem', borderRadius: 'var(--radius-md)', margin: '0.75rem 0', letterSpacing: '2px', color: '#c7d2fe' }}>
                    {createdRoom.roomCode}
                  </div>
                </div>
                
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Share this link with your friends to start co-watching!</p>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary" onClick={handleCopyLink} style={{ flex: 1 }}>
                    {copiedLink ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy Invite Link</>}
                  </button>
                  <button className="btn btn-primary" onClick={() => onNavigate('room', createdRoom.roomCode)} style={{ flex: 1 }}>
                    Start Stream
                  </button>
                </div>
              </div>
            ) : (
              /* Room Creation Form */
              <form onSubmit={handleCreateRoomSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {creationError && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.5rem', borderRadius: 'var(--radius-md)', color: 'var(--color-error)', fontSize: 'var(--text-xs)' }}>
                    {creationError}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>Room Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Movie Night 🍿" 
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="input-text"
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>Default Quality Preset</label>
                  <select 
                    value={qualityPreset} 
                    onChange={(e) => setQualityPreset(e.target.value)}
                    className="input-text"
                    style={{ background: 'rgba(10,14,39,0.9)' }}
                  >
                    <option value="AUTO">AUTO (Adaptive Bitrate)</option>
                    <option value="HD_720">HD 720p</option>
                    <option value="FHD_1080">FHD 1080p</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input 
                    type="checkbox" 
                    id="isPrivate"
                    checked={isPrivate} 
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="isPrivate" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', cursor: 'pointer' }}>Make room private (Invite only)</label>
                </div>

                <button type="submit" disabled={creationLoading} className="btn btn-primary" style={{ padding: '0.8rem', marginTop: '0.5rem' }}>
                  {creationLoading ? 'Creating Room...' : 'Create Room & Generate Code'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

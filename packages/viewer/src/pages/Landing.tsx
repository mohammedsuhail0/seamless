// Agent: 🌐 Agent C (Viewer App Landing Page)
// File: packages/viewer/src/pages/Landing.tsx

import React, { useState } from 'react';
import { useAuthStore } from '../stores/auth';
import { Tv, Shield, Zap, Sparkles, ArrowRight } from 'lucide-react';

interface LandingProps {
  onNavigate: (page: 'dashboard' | 'room', contextCode?: string) => void;
  setAuthContext: any;
}

export function Landing({ onNavigate, setAuthContext }: LandingProps) {
  const { user, login, register, isAuthenticated, logout } = useAuthStore();
  
  // Auth Form tabs state
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Quick Room Join code
  const [roomCode, setRoomCode] = useState('');

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setFormLoading(true);

    try {
      if (isLoginTab) {
        const loggedInUser = await login(email, password);
        setAuthContext(loggedInUser);
        onNavigate('dashboard');
      } else {
        const registeredUser = await register(email, displayName, password);
        setAuthContext(registeredUser);
        onNavigate('dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.error?.message || 'Authentication failed. Please verify inputs.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.length !== 6) {
      setErrorMsg('Room code must be exactly 6 characters');
      return;
    }
    onNavigate('room', roomCode.toUpperCase());
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh' }}>
      {/* Decorative Radial Glow overlays */}
      <div className="radial-glow" style={{ top: '-10%', left: '-10%' }} />
      <div className="radial-glow" style={{ bottom: '-15%', right: '-10%', background: 'radial-gradient(circle, rgba(124, 58, 237, 0.1) 0%, rgba(0,0,0,0) 70%)' }} />

      {/* Navbar */}
      <header className="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.75rem' }}>📡</span>
          <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '0.5px' }}>BrowSync</span>
        </div>
        <div>
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Hi, {user?.displayName}</span>
              <button className="btn btn-secondary" onClick={() => onNavigate('dashboard')}>Dashboard</button>
              <button className="btn btn-ghost" onClick={logout}>Logout</button>
            </div>
          ) : (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Secure P2P Signaling Node: Online</span>
          )}
        </div>
      </header>

      {/* Main Grid Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        
        {/* Left Hand: Hero Details */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(79, 70, 229, 0.1)', padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-full)', border: '1px solid rgba(79,70,229,0.2)', width: 'fit-content' }}>
            <Sparkles size={14} color="#a5b4fc" />
            <span style={{ fontSize: 'var(--text-xs)', color: '#c7d2fe', fontWeight: 600 }}>WebRTC P2P Co-Browsing</span>
          </div>

          <h1 style={{ fontSize: 'var(--text-5xl)', fontWeight: 800, lineHeight: 1.15 }}>
            Watch Together.<br />
            <span className="title-gradient">For Real.</span>
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-lg)', lineHeight: 1.6 }}>
            BrowSync streams your actual browser directly to friends over ultra-low latency WebRTC. No virtual servers, no geo-blocks, and no login issues. It's your computer, your Netflix account, your regional streaming — mirrored perfectly in real time.
          </p>

          {/* Quick Join Segment */}
          <div className="glass-card" style={{ padding: '1.5rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quick Join with invite code</h3>
            <form onSubmit={handleQuickJoin} style={{ display: 'flex', gap: '0.75rem' }}>
              <input 
                type="text" 
                placeholder="ENTER CODE (e.g. X7K2M9)"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="input-text"
                style={{ flex: 1, textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '1px' }}
              />
              <button type="submit" className="btn btn-primary">Join Room <ArrowRight size={16} /></button>
            </form>
          </div>
        </section>

        {/* Right Hand: Immersive Card Tabs Form */}
        <section style={{ display: 'flex', justifyContent: 'center' }}>
          {isAuthenticated ? (
            <div className="glass" style={{ width: '420px', borderRadius: 'var(--radius-xl)', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem', textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ fontSize: '3rem' }}>🎉</div>
              <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>Welcome Back!</h2>
              <p style={{ color: 'var(--text-secondary)' }}>You are logged in as <strong>{user?.displayName}</strong>. You can create screening rooms or join your friends' rooms from the dashboard.</p>
              <button className="btn btn-primary" onClick={() => onNavigate('dashboard')} style={{ padding: '0.8rem' }}>Go to Dashboard <ArrowRight size={18} /></button>
            </div>
          ) : (
            <div className="glass" style={{ width: '420px', borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: 'var(--shadow-lg)', border: '1px solid rgba(255,255,255,0.06)' }}>
              
              {/* Tab Selector */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)' }}>
                <button 
                  style={{ flex: 1, padding: '0.75rem', background: 'none', border: 'none', color: isLoginTab ? 'var(--text-primary)' : 'var(--text-muted)', borderBottom: isLoginTab ? '2px solid var(--color-primary)' : 'none', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => { setIsLoginTab(true); setErrorMsg(''); }}
                >
                  Sign In
                </button>
                <button 
                  style={{ flex: 1, padding: '0.75rem', background: 'none', border: 'none', color: !isLoginTab ? 'var(--text-primary)' : 'var(--text-muted)', borderBottom: !isLoginTab ? '2px solid var(--color-primary)' : 'none', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => { setIsLoginTab(false); setErrorMsg(''); }}
                >
                  Create Account
                </button>
              </div>

              {errorMsg && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--color-error)', fontSize: 'var(--text-xs)', fontWeight: 500 }}>
                  {errorMsg}
                </div>
              )}

              {/* Form Input elements */}
              <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>Email Address</label>
                  <input 
                    type="email" 
                    required
                    placeholder="arjun@test.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-text"
                  />
                </div>

                {!isLoginTab && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>Display Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Arjun" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="input-text"
                    />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>Password</label>
                  <input 
                    type="password" 
                    required
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-text"
                  />
                </div>

                <button type="submit" disabled={formLoading} className="btn btn-primary" style={{ padding: '0.8rem', marginTop: '0.5rem' }}>
                  {formLoading ? 'Connecting Securely...' : isLoginTab ? 'Login to BrowSync' : 'Create Account'}
                </button>
              </form>
            </div>
          )}
        </section>
      </main>

      {/* Highlights Grid */}
      <section style={{ maxWidth: '1200px', margin: '4rem auto', padding: '0 2rem', position: 'relative', zIndex: 1 }}>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, textAlign: 'center', marginBottom: '3rem' }}>Why existing co-watching tools fail</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem' }}>
          
          <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(79, 70, 229, 0.1)', padding: '0.5rem', borderRadius: 'var(--radius-md)', width: 'fit-content' }}>
              <Shield size={24} color="#818cf8" />
            </div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Zero Regional Geo-blocks</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
              Other apps use host servers in generic datacenters that trigger regional licensing blocks on Indian OTT channels. BrowSync streams directly from YOUR machine, completely bypassing regional lockouts.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: 'var(--radius-md)', width: 'fit-content' }}>
              <Tv size={24} color="#34d399" />
            </div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Keep All Subscriptions</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
              No need to relogin on a virtual screen. BrowSync displays your existing browser tabs: Netflix, Airtel Xstream, JioCinema, Hotstar—instantly logged in and ready to watch.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.5rem', borderRadius: 'var(--radius-md)', width: 'fit-content' }}>
              <Zap size={24} color="#fbbf24" />
            </div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Interactive Controls</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
              Request mouse and keyboard control with one click. Search a wiki page, type comments, or skip video intervals. Host remains in full control and can revoke access instantly.
            </p>
          </div>

        </div>
      </section>
    </div>
  );
}

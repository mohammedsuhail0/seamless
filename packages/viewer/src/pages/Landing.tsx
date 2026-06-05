// Agent: 🌐 Agent C (Viewer App Landing Page)
// File: packages/viewer/src/pages/Landing.tsx

import React, { useState } from 'react';
import { useAuthStore } from '../stores/auth';
import { Tv, Shield, Zap, Sparkles, ArrowRight } from 'lucide-react';

interface LandingProps {
  onNavigate: (page: 'landing' | 'onboarding' | 'dashboard' | 'room', contextCode?: string) => void;
  setAuthContext: any;
}

const MOCK_GOOGLE_ACCOUNTS = [
  { name: 'Alex Mercer', email: 'alex.mercer@gmail.com', avatarColor: '#ea4335' },
  { name: 'Priya Sharma', email: 'priya.sharma@gmail.com', avatarColor: '#4285f4' },
  { name: 'Arjun Mehta', email: 'arjun.mehta@gmail.com', avatarColor: '#34a853' },
];

export function Landing({ onNavigate, setAuthContext }: LandingProps) {
  const { user, login, register, googleCallback, isAuthenticated, logout } = useAuthStore();
  
  // Auth Form tabs state
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [authMethod, setAuthMethod] = useState<'options' | 'email' | 'google'>('options');
  const [googleStep, setGoogleStep] = useState<'chooser' | 'custom-email'>('chooser');
  const [googleEmail, setGoogleEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Quick Room Join code
  const [roomCode, setRoomCode] = useState('');

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setFormLoading(true);
 
    const cleanUsername = username.trim().toLowerCase();
    const resolvedEmail = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@browsync.local`;
    const resolvedDisplayName = username.trim();

    try {
      if (isLoginTab) {
        const loggedInUser = await login(resolvedEmail, password);
        setAuthContext(loggedInUser);
        onNavigate('dashboard');
      } else {
        const registeredUser = await register(resolvedEmail, resolvedDisplayName, password);
        setAuthContext(registeredUser);
        onNavigate('dashboard');
      }
    } catch (err: any) {
      let msg = err.error?.message || 'Authentication failed. Please verify inputs.';
      if (msg.toLowerCase().includes('email')) {
        msg = msg.replace(/email/ig, 'Username');
      }
      setErrorMsg(msg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleGoogleSelectEmail = async (email: string) => {
    setErrorMsg('');
    setFormLoading(true);
    try {
      // Simulate ID Token for mock selector
      const mockIdToken = `mock_id_token_${email.toLowerCase()}`;
      const result = await googleCallback(mockIdToken);
      
      if (result.status === 'AUTHENTICATED') {
        setAuthContext(result.user);
        onNavigate('dashboard');
      } else if (result.status === 'ONBOARDING_REQUIRED') {
        onNavigate('onboarding');
      }
    } catch (err: any) {
      setErrorMsg(err.error?.message || 'Google Authentication failed.');
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
      <header className="glass landing-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', position: 'sticky', top: 0, zIndex: 10 }}>
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
      <main className="landing-hero-grid" style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        
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
            <div className="glass" style={{ width: '100%', maxWidth: '420px', borderRadius: 'var(--radius-xl)', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem', textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ fontSize: '3rem' }}>🎉</div>
              <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>Welcome Back!</h2>
              <p style={{ color: 'var(--text-secondary)' }}>You are logged in as <strong>{user?.displayName}</strong>. You can create screening rooms or join your friends' rooms from the dashboard.</p>
              <button className="btn btn-primary" onClick={() => onNavigate('dashboard')} style={{ padding: '0.8rem' }}>Go to Dashboard <ArrowRight size={18} /></button>
            </div>
          ) : (
            <div className="glass" style={{ width: '100%', maxWidth: '420px', borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: 'var(--shadow-lg)', border: '1px solid rgba(255,255,255,0.06)' }}>
              
              {/* Tab Selector (only visible in root options / email form) */}
              {authMethod !== 'google' && (
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)' }}>
                  <button 
                    style={{ flex: 1, padding: '0.75rem', background: 'none', border: 'none', color: isLoginTab ? 'var(--text-primary)' : 'var(--text-muted)', borderBottom: isLoginTab ? '2px solid var(--color-primary)' : 'none', fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => { setIsLoginTab(true); setAuthMethod('options'); setErrorMsg(''); }}
                  >
                    Sign In
                  </button>
                  <button 
                    style={{ flex: 1, padding: '0.75rem', background: 'none', border: 'none', color: !isLoginTab ? 'var(--text-primary)' : 'var(--text-muted)', borderBottom: !isLoginTab ? '2px solid var(--color-primary)' : 'none', fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => { setIsLoginTab(false); setAuthMethod('options'); setErrorMsg(''); }}
                  >
                    Create Account
                  </button>
                </div>
              )}

              {errorMsg && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--color-error)', fontSize: 'var(--text-xs)', fontWeight: 500 }}>
                  {errorMsg}
                </div>
              )}

              {authMethod === 'options' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem 0' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', textAlign: 'center', marginBottom: '0.5rem' }}>
                    {isLoginTab ? 'Sign in to start co-browsing and hosting rooms' : 'Create an account to start hosting co-browsing rooms'}
                  </p>
                  
                  {/* Google Login Button */}
                  <button 
                    className="btn" 
                    type="button"
                    disabled={formLoading}
                    onClick={() => {
                      setAuthMethod('google');
                      setGoogleStep('chooser');
                      setErrorMsg('');
                    }} 
                    style={{ 
                      background: '#ffffff', 
                      color: '#000000', 
                      padding: '0.8rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 600,
                      width: '100%',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      cursor: 'pointer'
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6c-.28 1.48-1.12 2.73-2.38 3.58v3h3.84c2.25-2.07 3.54-5.12 3.54-8.4z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.84-3c-1.07.72-2.44 1.16-4.12 1.16-3.17 0-5.85-2.14-6.81-5.02H1.26v3.1A11.99 11.99 0 0012 24z"/>
                      <path fill="#FBBC05" d="M5.19 14.23A7.18 7.18 0 014.8 12c0-.79.13-1.56.39-2.23V6.67H1.26A11.99 11.99 0 000 12c0 2.02.5 3.92 1.26 5.66l3.93-3.43z"/>
                      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.59 1.8l3.43-3.43C17.96 1.08 15.24 0 12 0 7.37 0 3.32 2.66 1.26 6.67l3.93 3.43c.96-2.88 3.64-5.02 6.81-5.02z"/>
                    </svg>
                    {isLoginTab ? 'Continue with Google' : 'Sign up with Google'}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: 'var(--text-xs)', margin: '0.5rem 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
                    OR
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
                  </div>

                  {/* Username/Email Toggle Button */}
                  <button 
                    className="btn btn-secondary" 
                    type="button"
                    onClick={() => setAuthMethod('email')}
                    style={{ padding: '0.8rem', width: '100%' }}
                  >
                    {isLoginTab ? 'Use Username & Password' : 'Sign up with Username & Password'}
                  </button>
                </div>
              )}

              {authMethod === 'email' && (
                /* Form Input elements */
                <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>Username</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. arjun" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="input-text"
                    />
                  </div>

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
                    {!isLoginTab && (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Must be at least 8 characters, include 1 uppercase and 1 number
                      </span>
                    )}
                  </div>

                  <button type="submit" disabled={formLoading} className="btn btn-primary" style={{ padding: '0.8rem', marginTop: '0.5rem' }}>
                    {formLoading ? 'Connecting Securely...' : isLoginTab ? 'Login to BrowSync' : 'Create Account'}
                  </button>

                  <button 
                    type="button" 
                    className="btn btn-ghost" 
                    onClick={() => { setAuthMethod('options'); setErrorMsg(''); }}
                    style={{ fontSize: 'var(--text-xs)', padding: '0.5rem', width: '100%' }}
                  >
                    ← Back to other options
                  </button>
                </form>
              )}

              {authMethod === 'google' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Google Account Selector Mode */}
                  {googleStep === 'chooser' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textAlign: 'center' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" style={{ marginBottom: '0.5rem' }}>
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6c-.28 1.48-1.12 2.73-2.38 3.58v3h3.84c2.25-2.07 3.54-5.12 3.54-8.4z"/>
                          <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.84-3c-1.07.72-2.44 1.16-4.12 1.16-3.17 0-5.85-2.14-6.81-5.02H1.26v3.1A11.99 11.99 0 0012 24z"/>
                          <path fill="#FBBC05" d="M5.19 14.23A7.18 7.18 0 014.8 12c0-.79.13-1.56.39-2.23V6.67H1.26A11.99 11.99 0 000 12c0 2.02.5 3.92 1.26 5.66l3.93-3.43z"/>
                          <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.59 1.8l3.43-3.43C17.96 1.08 15.24 0 12 0 7.37 0 3.32 2.66 1.26 6.67l3.93 3.43c.96-2.88 3.64-5.02 6.81-5.02z"/>
                        </svg>
                        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>Choose an account</h2>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>to continue to <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>BrowSync</span></p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {MOCK_GOOGLE_ACCOUNTS.map((account) => (
                          <button
                            key={account.email}
                            type="button"
                            disabled={formLoading}
                            onClick={() => handleGoogleSelectEmail(account.email)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '1rem',
                              padding: '0.75rem 1rem',
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid rgba(255, 255, 255, 0.06)',
                              borderRadius: 'var(--radius-md)',
                              cursor: 'pointer',
                              textAlign: 'left',
                              width: '100%',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!formLoading) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                            }}
                          >
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: account.avatarColor,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontWeight: 700,
                              fontSize: 'var(--text-sm)'
                            }}>
                              {account.name.charAt(0)}
                            </div>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{account.name}</div>
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden' }}>{account.email}</div>
                            </div>
                          </button>
                        ))}

                        <button
                          type="button"
                          disabled={formLoading}
                          onClick={() => {
                            setGoogleStep('custom-email');
                            setErrorMsg('');
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.75rem 1rem',
                            background: 'none',
                            border: '1px dashed rgba(255, 255, 255, 0.15)',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                            color: 'var(--text-secondary)',
                            transition: 'all 0.15s ease',
                            marginTop: '0.25rem'
                          }}
                          onMouseEnter={(e) => {
                            if (!formLoading) {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                              e.currentTarget.style.borderColor = 'var(--color-primary)';
                              e.currentTarget.style.color = 'var(--text-primary)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }}
                        >
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 'var(--text-sm)'
                          }}>
                            ➕
                          </div>
                          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Use another account</div>
                        </button>
                      </div>

                      <button 
                        type="button" 
                        disabled={formLoading}
                        className="btn btn-ghost" 
                        onClick={() => { setAuthMethod('options'); setErrorMsg(''); }}
                        style={{ fontSize: 'var(--text-xs)', padding: '0.5rem', width: '100%', marginTop: '0.5rem' }}
                      >
                        ← Back to other options
                      </button>
                    </div>
                  )}

                  {/* Google Custom Email Entry Mode */}
                  {googleStep === 'custom-email' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textAlign: 'center' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" style={{ marginBottom: '0.5rem' }}>
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6c-.28 1.48-1.12 2.73-2.38 3.58v3h3.84c2.25-2.07 3.54-5.12 3.54-8.4z"/>
                          <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.84-3c-1.07.72-2.44 1.16-4.12 1.16-3.17 0-5.85-2.14-6.81-5.02H1.26v3.1A11.99 11.99 0 0012 24z"/>
                          <path fill="#FBBC05" d="M5.19 14.23A7.18 7.18 0 014.8 12c0-.79.13-1.56.39-2.23V6.67H1.26A11.99 11.99 0 000 12c0 2.02.5 3.92 1.26 5.66l3.93-3.43z"/>
                          <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.59 1.8l3.43-3.43C17.96 1.08 15.24 0 12 0 7.37 0 3.32 2.66 1.26 6.67l3.93 3.43c.96-2.88 3.64-5.02 6.81-5.02z"/>
                        </svg>
                        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>Sign in with Google</h2>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Use your Google Account</p>
                      </div>

                      <form onSubmit={(e) => {
                        e.preventDefault();
                        if (googleEmail.trim()) {
                          handleGoogleSelectEmail(googleEmail.trim().toLowerCase());
                        }
                      }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>Email or phone</label>
                          <input
                            type="email"
                            required
                            placeholder="username@gmail.com"
                            value={googleEmail}
                            onChange={(e) => setGoogleEmail(e.target.value)}
                            className="input-text"
                            style={{ width: '100%' }}
                          />
                        </div>
                        
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => {
                              setGoogleStep('chooser');
                              setErrorMsg('');
                            }}
                            style={{ flex: 1, padding: '0.8rem' }}
                          >
                            Back
                          </button>
                          <button
                            type="submit"
                            disabled={formLoading || !googleEmail.trim()}
                            className="btn btn-primary"
                            style={{ flex: 1, padding: '0.8rem' }}
                          >
                            {formLoading ? 'Checking...' : 'Next'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}
        </section>
      </main>


      {/* Highlights Grid */}
      <section style={{ maxWidth: '1200px', margin: '4rem auto', padding: '0 2rem', position: 'relative', zIndex: 1 }}>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, textAlign: 'center', marginBottom: '3rem' }}>Why existing co-watching tools fail</h2>
        <div className="highlights-grid">
          
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

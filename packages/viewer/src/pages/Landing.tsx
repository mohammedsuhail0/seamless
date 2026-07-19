// Agent: 🌐 Agent C (Viewer App Landing Page)
// File: packages/viewer/src/pages/Landing.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../stores/auth';
import { Sparkles, ArrowRight, Chrome, AlertCircle, Globe, RefreshCw } from 'lucide-react';

interface LandingProps {
  onNavigate: (page: 'landing' | 'dashboard' | 'room', contextCode?: string) => void;
  setAuthContext: any;
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

export function Landing({ onNavigate, setAuthContext }: LandingProps) {
  const { user, login, register, isAuthenticated, logout, googleCallback, googleOnboard, tempGoogleSession } = useAuthStore();
  
  // Auth Form tabs state
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleInitRef = useRef(false);

  // Quick Room Join code
  const [roomCode, setRoomCode] = useState('');

  const googleClientId = ((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined) || '';

  useEffect(() => {
    if (!googleClientId || googleInitRef.current || tempGoogleSession) return;

    const scriptId = 'google-identity-script';
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;

    const initializeGoogle = () => {
      const google = (window as any).google;
      if (!google?.accounts?.id || !googleButtonRef.current || googleInitRef.current) return;

      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response: { credential?: string }) => {
          if (!response?.credential) {
            setGoogleError('Google sign-in did not return a token.');
            return;
          }

          setGoogleError('');
          setFormLoading(true);

          try {
            const result = await googleCallback(response.credential);
            if (result.status === 'AUTHENTICATED') {
              setAuthContext(result.user);
              onNavigate('dashboard');
            }
          } catch (err: any) {
            setGoogleError(err?.error?.message || 'Google sign-in failed.');
          } finally {
            setFormLoading(false);
          }
        },
      });

      google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'filled_black',
        size: 'large',
        width: 360,
        text: 'continue_with',
        shape: 'rectangular',
      });

      googleInitRef.current = true;
      setGoogleReady(true);
    };

    if (!existing) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      script.onerror = () => setGoogleError('Could not load Google sign-in.');
      document.body.appendChild(script);
      return;
    }

    if ((window as any).google) {
      initializeGoogle();
      return;
    }

    existing.addEventListener('load', initializeGoogle);
    return () => existing.removeEventListener('load', initializeGoogle);
  }, [googleClientId, googleCallback, onNavigate, setAuthContext, tempGoogleSession]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setFormLoading(true);
 
    const cleanIdentifier = emailOrUsername.trim().toLowerCase();
    const resolvedDisplayName = displayName.trim();

    try {
      if (isLoginTab) {
        const loggedInUser = await login(cleanIdentifier, password);
        setAuthContext(loggedInUser);
        onNavigate('dashboard');
      } else {
        const registeredUser = await register(cleanIdentifier, resolvedDisplayName, password);
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

  const handleGoogleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempGoogleSession) return;

    setErrorMsg('');
    setFormLoading(true);

    try {
      const result = await googleOnboard(displayName.trim(), password, tempGoogleSession.tempToken);
      if (result.status === 'AUTHENTICATED') {
        setAuthContext(result.user);
        onNavigate('dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err?.error?.message || 'Google onboarding failed.');
    } finally {
      setFormLoading(false);
    }
  };

  useEffect(() => {
    if (tempGoogleSession) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [tempGoogleSession]);

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.length !== 6) {
      setErrorMsg('Room code must be exactly 6 characters');
      return;
    }
    onNavigate('room', roomCode.toUpperCase());
  };

  return (
    <div className="landing-page-root" style={{ position: 'relative', overflowX: 'hidden', overflowY: 'auto', height: '100dvh', minHeight: '100vh', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {/* Decorative Radial Glow overlays */}
      <div className="radial-glow" style={{ top: '-10%', left: '-10%', background: 'radial-gradient(circle, rgba(197, 168, 92, 0.08) 0%, rgba(0,0,0,0) 70%)' }} />
      <div className="radial-glow" style={{ bottom: '-15%', right: '-10%', background: 'radial-gradient(circle, rgba(229, 9, 20, 0.05) 0%, rgba(0,0,0,0) 70%)' }} />

      {/* Navbar */}
      <header className="landing-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 2rem', position: 'sticky', top: 0, zIndex: 10, background: 'rgba(0, 0, 0, 0.75)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
        <div className="landing-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <GoldLogoSVG size={36} />
          <span style={{ fontWeight: 700, fontSize: '1.45rem', letterSpacing: '0.5px', color: '#c5a85c', fontFamily: 'var(--font-serif)' }}>Hypersync</span>
        </div>
        <div>
          {isAuthenticated ? (
            <div className="landing-user-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Hi, {user?.displayName}</span>
              <button className="btn btn-gold-outline" onClick={() => onNavigate('dashboard')}>Dashboard</button>
              <button
                className="btn btn-ghost"
                onClick={async () => {
                  await logout();
                  setAuthContext(null);
                  onNavigate('landing');
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <button 
              className="btn btn-gold-outline"
              onClick={() => {
                const card = document.getElementById('auth-form-card');
                if (card) {
                  card.scrollIntoView({ behavior: 'smooth' });
                  const input = card.querySelector('input');
                  if (input) input.focus();
                }
              }}
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="landing-main-grid">
        
        {/* Left Hand: Hero Details */}
        <section className="landing-hero-copy" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="landing-kicker" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(197, 168, 92, 0.1)', padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-full)', border: '1px solid rgba(197, 168, 92, 0.25)', width: 'fit-content' }}>
            <Sparkles size={14} color="#e3c578" />
            <span style={{ fontSize: 'var(--text-xs)', color: '#e3c578', fontWeight: 600 }}>🍿 The Ultimate Virtual Couch</span>
          </div>
 
          <h1 className="landing-title" style={{ fontSize: 'clamp(2.25rem, 6vw, 3.5rem)', fontWeight: 700, lineHeight: 1.15, color: '#ffffff' }}>
            Watch Together.<br />
            <span>From Your Real Browser.</span>
          </h1>

          <p className="landing-subtitle" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-lg)', lineHeight: 1.6 }}>
            Watch and browse together from your own real browser. Start a room, share a tab or screen, and let friends join instantly for videos, live events, shopping, research, or casual browsing.
          </p>

          <div className="landing-trust-line" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', padding: '0.75rem 0', margin: '0.5rem 0', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: 'var(--text-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Real-time synchronization across any device.
          </div>

          {/* Quick Join Segment */}
          <div className="quick-join-card">
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#c5a85c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quick Join with invite code</h3>
            <form onSubmit={handleQuickJoin} className="quick-join-form">
              <input 
                type="text" 
                placeholder="ROOM CODE"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="premium-input"
                style={{ flex: 1, textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '1px' }}
              />
              <button type="submit" className="btn btn-netflix">Join Room <ArrowRight size={16} /></button>
            </form>
          </div>
        </section>

        {/* Right Hand: Immersive Card Tabs Form */}
        <section className="landing-auth-panel" style={{ display: 'flex', justifyContent: 'center' }}>
          {isAuthenticated ? (
            <div className="glass" style={{ width: '100%', maxWidth: '420px', borderRadius: 'var(--radius-xl)', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem', textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ fontSize: '3rem' }}>🎉</div>
              <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Welcome Back!</h2>
              <p style={{ color: 'var(--text-secondary)' }}>You are logged in as <strong>{user?.displayName}</strong>. You can create screening rooms or join your friends' rooms from the dashboard.</p>
              <button className="btn btn-netflix" onClick={() => onNavigate('dashboard')} style={{ padding: '0.8rem', width: '100%' }}>Go to Dashboard <ArrowRight size={18} /></button>
            </div>
          ) : (
            <div id="auth-form-card" className="glass auth-form-card">
              {tempGoogleSession && (
                <div style={{ background: 'rgba(229, 9, 20, 0.1)', border: '1px solid rgba(229, 9, 20, 0.25)', borderRadius: 'var(--radius-lg)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: '#ffffff' }}>
                    <Chrome size={16} />
                    Finish Google sign-up
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    Google confirmed <strong>{tempGoogleSession.email}</strong>. Choose a display name and password to create your Hypersync profile.
                  </div>
                </div>
              )}
              
              {/* Tab Selector */}
              {!tempGoogleSession && (
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)' }}>
                  <button 
                    style={{ flex: 1, padding: '0.75rem', background: 'none', border: 'none', color: isLoginTab ? '#ffffff' : 'var(--text-muted)', borderBottom: isLoginTab ? '2.5px solid var(--color-gold)' : 'none', fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => { setIsLoginTab(true); setErrorMsg(''); }}
                  >
                    Sign In
                  </button>
                  <button 
                    style={{ flex: 1, padding: '0.75rem', background: 'none', border: 'none', color: !isLoginTab ? '#ffffff' : 'var(--text-muted)', borderBottom: !isLoginTab ? '2.5px solid var(--color-gold)' : 'none', fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => { setIsLoginTab(false); setErrorMsg(''); }}
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

              {/* Form Input elements */}
              <form onSubmit={tempGoogleSession ? handleGoogleOnboard : handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {tempGoogleSession ? (
                  <div style={{ background: 'rgba(197, 168, 92, 0.08)', border: '1px solid rgba(197,168,92,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Chrome size={14} />
                    Google account detected: {tempGoogleSession.email}
                  </div>
                ) : null}

                {!tempGoogleSession && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: 'var(--text-xs)', color: '#ffffff', fontWeight: 600 }}>{isLoginTab ? 'Username or Email' : 'Email'}</label>
                    <input 
                      type="text" 
                      required
                      placeholder={isLoginTab ? 'Enter username' : 'Enter email'} 
                      value={emailOrUsername}
                      onChange={(e) => setEmailOrUsername(e.target.value)}
                      className="premium-input"
                    />
                  </div>
                )}

                {!isLoginTab && !tempGoogleSession && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: 'var(--text-xs)', color: '#ffffff', fontWeight: 600 }}>Display Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Enter display name" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="premium-input"
                    />
                  </div>
                )}

                {tempGoogleSession && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: 'var(--text-xs)', color: '#ffffff', fontWeight: 600 }}>Choose Display Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Enter display name" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="premium-input"
                    />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: 'var(--text-xs)', color: '#ffffff', fontWeight: 600 }}>Password</label>
                  <input 
                    type="password" 
                    required
                    placeholder="Enter password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="premium-input"
                  />
                  {!isLoginTab && (
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Must be at least 8 characters, include 1 uppercase and 1 number
                    </span>
                  )}
                </div>

                <button type="submit" disabled={formLoading} className="btn btn-netflix" style={{ padding: '0.85rem', marginTop: '0.5rem', width: '100%' }}>
                  {formLoading ? 'Connecting Securely...' : tempGoogleSession ? 'Finish Google Signup' : isLoginTab ? 'Continue' : 'Create Account'}
                </button>
              </form>

              {!tempGoogleSession && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                    <span style={{ height: '1px', flex: 1, background: 'var(--border-default)' }} />
                    <span>or</span>
                    <span style={{ height: '1px', flex: 1, background: 'var(--border-default)' }} />
                  </div>

                  {googleClientId ? (
                    <div>
                      <div ref={googleButtonRef} />
                      {!googleReady && !googleError && (
                        <span style={{ display: 'block', marginTop: '0.5rem', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          Loading Google sign-in...
                        </span>
                      )}
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251,191,36,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={14} />
                      Add `VITE_GOOGLE_CLIENT_ID` to enable Google sign-in.
                    </div>
                  )}

                  {googleError && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--color-error)', fontSize: 'var(--text-xs)' }}>
                      {googleError}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Highlights Grid */}
      <section className="landing-highlights-section" style={{ maxWidth: '1200px', margin: '4rem auto', padding: '0 2rem', position: 'relative', zIndex: 1 }}>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, textAlign: 'center', marginBottom: '3rem', color: '#ffffff' }}>Why you'll love Hypersync</h2>
        <div className="highlights-grid">
          
          <div className="glass-card" style={{ padding: '2.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', background: 'rgba(12, 12, 12, 0.75)', border: '1px solid rgba(197, 168, 92, 0.15)', borderRadius: 'var(--radius-lg)' }}>
            <div className="gold-icon-container">
              <Globe size={24} color="var(--color-gold)" />
            </div>
            <div>
            <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: '#ffffff', marginBottom: '0.25rem' }}>Shared Browser Rooms</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
                Host a live browser session and let friends watch, chat, and browse with you.
            </p>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '2.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', background: 'rgba(12, 12, 12, 0.75)', border: '1px solid rgba(197, 168, 92, 0.15)', borderRadius: 'var(--radius-lg)' }}>
            <div className="gold-icon-container">
              <RefreshCw size={24} color="var(--color-gold)" />
            </div>
            <div>
            <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: '#ffffff', marginBottom: '0.25rem' }}>Controlled Sharing</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
                The host stays in charge while viewers join instantly and follow along.
            </p>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', background: '#000000', padding: '3rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', zIndex: 1, position: 'relative' }}>
        <GoldLogoSVG size={40} />
        <div style={{ display: 'flex', gap: '2rem', fontSize: 'var(--text-sm)' }}>
          <a href="#terms" style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }} className="hover-gold">Terms</a>
          <a href="#privacy" style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }} className="hover-gold">Privacy</a>
          <a href="#support" style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }} className="hover-gold">Support</a>
          <a href="#contact" style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }} className="hover-gold">Contact</a>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
          © 2026 Hypersync.
        </p>
      </footer>
    </div>
  );
}

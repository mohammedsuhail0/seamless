// Agent: 🌐 Agent C (Viewer App Landing Page)
// File: packages/viewer/src/pages/Landing.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../stores/auth';
import { Tv, Shield, Sparkles, ArrowRight, Chrome, AlertCircle } from 'lucide-react';

interface LandingProps {
  onNavigate: (page: 'landing' | 'dashboard' | 'room', contextCode?: string) => void;
  setAuthContext: any;
}

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
        theme: 'outline',
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
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>🍿 Ready for showtime!</span>
          )}
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="landing-hero-grid" style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        
        {/* Left Hand: Hero Details */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(79, 70, 229, 0.1)', padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-full)', border: '1px solid rgba(79,70,229,0.2)', width: 'fit-content' }}>
            <Sparkles size={14} color="#a5b4fc" />
            <span style={{ fontSize: 'var(--text-xs)', color: '#c7d2fe', fontWeight: 600 }}>🍿 The Ultimate Virtual Couch</span>
          </div>

          <h1 style={{ fontSize: 'var(--text-5xl)', fontWeight: 800, lineHeight: 1.15 }}>
            Watch Together.<br />
            <span className="title-gradient">For Real.</span>
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-lg)', lineHeight: 1.6 }}>
            Stop fighting with blurry screen shares and annoying copyright blocks. BrowSync streams whatever is on your browser to friends in real time with crystal-clear, zero-lag video. Share your Netflix, watch regional shows, browse memes, or shop together. It's just like sharing the same screen on the same couch.
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
              {tempGoogleSession && (
                <div style={{ background: 'rgba(59, 130, 246, 0.10)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 'var(--radius-lg)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                    <Chrome size={16} />
                    Finish Google sign-up
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    Google confirmed <strong>{tempGoogleSession.email}</strong>. Choose a display name and password to create your BrowSync profile.
                  </div>
                </div>
              )}
              
              {/* Tab Selector */}
              {!tempGoogleSession && (
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
              )}

              {errorMsg && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--color-error)', fontSize: 'var(--text-xs)', fontWeight: 500 }}>
                  {errorMsg}
                </div>
              )}

              {/* Form Input elements */}
              <form onSubmit={tempGoogleSession ? handleGoogleOnboard : handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {tempGoogleSession ? (
                  <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59,130,246,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Chrome size={14} />
                    Google account detected: {tempGoogleSession.email}
                  </div>
                ) : null}

                {!tempGoogleSession && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>{isLoginTab ? 'Username or Email' : 'Email'}</label>
                    <input 
                      type="text" 
                      required
                      placeholder={isLoginTab ? 'e.g. arjun or arjun@email.com' : 'e.g. arjun@email.com'} 
                      value={emailOrUsername}
                      onChange={(e) => setEmailOrUsername(e.target.value)}
                      className="input-text"
                    />
                  </div>
                )}

                {!isLoginTab && !tempGoogleSession && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>Display Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Arjun" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="input-text"
                    />
                  </div>
                )}

                {tempGoogleSession && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>Choose Display Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Arjun" 
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
                  {!isLoginTab && (
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Must be at least 8 characters, include 1 uppercase and 1 number
                    </span>
                  )}
                </div>

                <button type="submit" disabled={formLoading} className="btn btn-primary" style={{ padding: '0.8rem', marginTop: '0.5rem' }}>
                  {formLoading ? 'Connecting Securely...' : tempGoogleSession ? 'Finish Google Signup' : isLoginTab ? 'Login to BrowSync' : 'Create Account'}
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
      <section style={{ maxWidth: '1200px', margin: '4rem auto', padding: '0 2rem', position: 'relative', zIndex: 1 }}>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, textAlign: 'center', marginBottom: '3rem' }}>Why you'll love BrowSync</h2>
        <div className="highlights-grid">
          
          <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(79, 70, 229, 0.1)', padding: '0.5rem', borderRadius: 'var(--radius-md)', width: 'fit-content' }}>
              <Shield size={24} color="#818cf8" />
            </div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Watch Anything, Anywhere</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
              Tired of seeing a black screen when sharing Netflix or Disney+? If it works on your browser, it works here. No copyright blockouts, no regional geo-blocks, and no streaming limits.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: 'var(--radius-md)', width: 'fit-content' }}>
              <Tv size={24} color="#34d399" />
            </div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>No Account Sharing Required</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
              Your friends don't need subscriptions to watch with you. Since you're hosting from your own computer, they can see exactly what you're playing. Just open a tab, hit play, and relax.
            </p>
          </div>



        </div>
      </section>
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../stores/auth';
import { sound } from '../lib/sound';
import { animate, stagger } from 'animejs';
import { 
  ArrowRight, 
  Tv, 
  KeyRound, 
  ShieldCheck, 
  Lock, 
  User, 
  Mail, 
  Volume2,
  LogIn,
  Eye,
  EyeOff
} from 'lucide-react';

interface LandingProps {
  onNavigate: (page: 'landing' | 'dashboard' | 'room', contextCode?: string) => void;
  setAuthContext: any;
}

export function Landing({ onNavigate, setAuthContext }: LandingProps) {
  const { login, register, googleCallback, tempGoogleSession } = useAuthStore();
  
  // Auth Form tabs
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Quick Room Join
  const [roomCode, setRoomCode] = useState('');

  // Google Sign-In
  const [googleError, setGoogleError] = useState('');
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleButtonMobileRef = useRef<HTMLDivElement | null>(null);
  const googleInitRef = useRef(false);

  // Mobile zero-scroll tab
  // Mobile view tab switcher ('auth' = Sign In first, 'join' = Code second)
  const [mobileTab, setMobileTab] = useState<'auth' | 'join'>('auth');

  const googleClientId = ((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined) || '235405233467-mah2rt1mo7pij09uvinqtukk2l8vvi49.apps.googleusercontent.com';

  // Stagger reveal on mount with Anime.js
  useEffect(() => {
    try {
      animate('.spatial-landing-reveal', {
        translateY: [28, 0],
        opacity: [0, 1],
        delay: stagger(90, { start: 120 }),
        ease: 'out(3)',
        duration: 750,
      });
    } catch (_) {}
  }, []);

  // Google Identity Services setup
  useEffect(() => {
    if (!googleClientId || googleInitRef.current || tempGoogleSession) return;

    const scriptId = 'google-identity-script';
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;

    const initializeGoogle = () => {
      const google = (window as any).google;
      if (!google?.accounts?.id) return;

      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response: { credential?: string }) => {
          if (!response?.credential) {
            setGoogleError('Google sign-in did not return a credential token.');
            return;
          }

          setGoogleError('');
          setFormLoading(true);
          sound.thud();

          try {
            const result = await googleCallback(response.credential);
            if (result.status === 'AUTHENTICATED') {
              sound.chime();
              setAuthContext(result.user);
              onNavigate('dashboard');
            }
          } catch (err: any) {
            setGoogleError(err?.error?.message || 'Google sign-in verification failed.');
          } finally {
            setFormLoading(false);
          }
        },
      });

      if (googleButtonRef.current) {
        google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'filled_black',
          size: 'large',
          width: 320,
          text: 'continue_with',
          shape: 'pill',
        });
      }

      if (googleButtonMobileRef.current) {
        google.accounts.id.renderButton(googleButtonMobileRef.current, {
          theme: 'filled_black',
          size: 'large',
          width: 280,
          text: 'continue_with',
          shape: 'pill',
        });
      }
    };

    if (!existing) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      document.body.appendChild(script);
    } else {
      initializeGoogle();
    }
  }, [googleClientId, tempGoogleSession]);

  // Re-render Google button when switching to auth tab on mobile
  useEffect(() => {
    const google = (window as any).google;
    if (google?.accounts?.id && googleButtonMobileRef.current) {
      try {
        google.accounts.id.renderButton(googleButtonMobileRef.current, {
          theme: 'filled_black',
          size: 'large',
          width: 280,
          text: 'continue_with',
          shape: 'pill',
        });
      } catch (_) {}
    }
  }, [mobileTab]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setFormLoading(true);
    sound.click();

    try {
      if (isLoginTab) {
        const u = await login(emailOrUsername, password);
        sound.chime();
        setAuthContext(u);
        onNavigate('dashboard');
      } else {
        const u = await register(emailOrUsername, displayName || emailOrUsername.split('@')[0], password);
        sound.chime();
        setAuthContext(u);
        onNavigate('dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err?.error?.message || err?.message || 'Authentication failed. Please verify inputs.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = roomCode.trim().toUpperCase();
    if (!clean) return;
    sound.thud();
    onNavigate('room', clean);
  };

  return (
    <>
      {/* ── 📱 MOBILE VIEW: 100% LOCKED 100dvh (STRICTLY NO SCROLL & ZERO EMPTY VOIDS) ── */}
      <div 
        className="flex md:hidden flex-1 w-full h-[100dvh] max-h-[100dvh] px-4 flex-col justify-between items-center overflow-hidden relative"
        style={{
          paddingTop: 'max(5.5rem, calc(env(safe-area-inset-top, 0px) + 4.75rem))',
          paddingBottom: 'max(1.25rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))',
        }}
      >
        {/* Warm Ambient Specular Light Dome behind mobile hero */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.16) 0%, rgba(244, 63, 94, 0.10) 45%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />

        {/* 1. Confident Mobile Hero Header (Placed lower down, clean text, no pill) */}
        <div className="relative z-10 flex flex-col items-center text-center gap-2.5 max-w-sm pt-4">
          <span className="text-[11px] sm:text-xs font-mono tracking-[0.22em] uppercase text-amber-300/85 font-semibold">
            Made for Friends
          </span>
          <h1 className="text-[34px] sm:text-4xl font-extrabold tracking-tight text-white leading-[1.1]">
            Watch with <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-300 to-rose-400">your people.</span>
          </h1>
          <p className="text-sm text-white/70 max-w-xs leading-relaxed">
            Watch videos, browse together, and hang out with friends in real-time.
          </p>
        </div>

        {/* 2. Middle Interactive Block: Unified Glass Interaction Card */}
        <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
          {/* Unified Spatial Glass Interaction Unit */}
          <div className="w-full rounded-3xl bg-[#0d0e16]/90 backdrop-blur-2xl border border-white/[0.1] shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.12)] p-4 sm:p-5 flex flex-col gap-4">
            
            {/* Segmented Switcher Pill: Option 1 = Sign In, Option 2 = Join with Code */}
            <div className="w-full grid grid-cols-2 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
              <button
                type="button"
                onClick={() => {
                  sound.click();
                  setMobileTab('auth');
                }}
                className={`
                  py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5
                  ${mobileTab === 'auth' 
                    ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]' 
                    : 'text-white/60 hover:text-white'}
                `}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.click();
                  setMobileTab('join');
                }}
                className={`
                  py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5
                  ${mobileTab === 'join' 
                    ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]' 
                    : 'text-white/60 hover:text-white'}
                `}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Join with Code</span>
              </button>
            </div>

            {/* OPTION 1: SIGN IN / REGISTER */}
            {mobileTab === 'auth' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setIsLoginTab(true)}
                      className={`px-3 py-1 rounded-lg text-xs transition-colors ${isLoginTab ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-white/50'}`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsLoginTab(false)}
                      className={`px-3 py-1 rounded-lg text-xs transition-colors ${!isLoginTab ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-white/50'}`}
                    >
                      Register
                    </button>
                  </div>
                  <span className="text-[10px] font-mono text-white/40">
                    {isLoginTab ? 'Welcome Back' : 'Create Account'}
                  </span>
                </div>

                {errorMsg && (
                  <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-[11px]">
                    {errorMsg}
                  </div>
                )}

                {/* Google One-Tap */}
                <div ref={googleButtonMobileRef} className="w-full flex justify-center min-h-[40px]" />

                <div className="flex items-center gap-2 my-0.5">
                  <div className="h-px bg-white/10 flex-1" />
                  <span className="text-[9px] font-mono text-white/30 uppercase">or credentials</span>
                  <div className="h-px bg-white/10 flex-1" />
                </div>

                <form onSubmit={handleAuthSubmit} className="flex flex-col gap-2.5">
                  {!isLoginTab && (
                    <input
                      type="text"
                      required
                      placeholder="Nickname"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-base sm:text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400"
                    />
                  )}
                  <input
                    type={isLoginTab ? 'text' : 'email'}
                    required
                    placeholder={isLoginTab ? 'Email or Username' : 'Email Address'}
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-base sm:text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400"
                  />
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 pr-10 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-base sm:text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 p-1.5 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full min-h-[44px] py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-black font-semibold text-xs tracking-wide shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {formLoading ? 'Authenticating...' : (isLoginTab ? 'Sign In' : 'Create Account')}
                  </button>
                  <div className="flex items-center justify-center gap-1.5 pt-1 text-xs text-white/50">
                    <span>{isLoginTab ? "Don't have an account?" : "Already have an account?"}</span>
                    <button
                      type="button"
                      onClick={() => {
                        sound.click();
                        setIsLoginTab(!isLoginTab);
                        setErrorMsg('');
                      }}
                      className="font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-2 transition-colors py-0.5"
                    >
                      {isLoginTab ? 'Register' : 'Sign In'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* OPTION 2: JOIN WITH CODE */}
            {mobileTab === 'join' && (
              <div className="flex flex-col gap-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono uppercase tracking-wider text-amber-200/60">Enter Room Code</span>
                  <span className="font-mono text-white/40 text-[11px]">6 Characters</span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="e.g. 7K9X2M"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xl font-mono tracking-[0.25em] text-amber-300 placeholder-white/20 focus:outline-none focus:border-amber-400 focus:bg-white/[0.06] transition-all uppercase"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          sound.click();
                          const match = text.match(/([A-Za-z0-9]{6})/);
                          setRoomCode(match ? match[1].toUpperCase() : text.trim().slice(0, 6).toUpperCase());
                        }
                      } catch (_) {}
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 min-h-[34px] px-3 py-1 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs font-mono text-white/80 hover:text-white transition-colors"
                  >
                    Paste
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleQuickJoin}
                  disabled={!roomCode.trim()}
                  className="w-full min-h-[48px] py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-black text-sm font-semibold tracking-wide border border-amber-400/30 transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(245,158,11,0.35)]"
                >
                  <span>Join Live Stream</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Feature Highlights Ribbon */}
                <div className="grid grid-cols-3 gap-1 pt-2.5 border-t border-white/[0.06] text-center text-[11px] text-white/50">
                  <span className="flex items-center justify-center gap-1">📺 Watch Live</span>
                  <span className="flex items-center justify-center gap-1">⚡ Zero Lag</span>
                  <span className="flex items-center justify-center gap-1">🔒 Private</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Micro Footer */}
        <div className="relative z-10 text-center text-[10px] text-white/35 font-mono">
          BroSync • Real-Time Together
        </div>
      </div>

      {/* ── 💻 DESKTOP VIEW: FULL SPATIAL VISION-OS SPLIT ── */}
      <div className="hidden md:flex flex-1 w-full max-w-5xl mx-auto px-6 pt-24 pb-16 flex-col justify-center gap-12">
        <div className="grid grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Product Showcase & Friendship Hero */}
          <div className="col-span-7 flex flex-col gap-6">
            <div className="spatial-landing-reveal flex items-center gap-2">
              <span className="text-xs font-mono tracking-[0.2em] uppercase text-amber-300/80 font-medium">
                Made for Friends
              </span>
            </div>

            <h1 className="spatial-landing-reveal text-4xl lg:text-6xl font-semibold tracking-tight text-white leading-[1.08]">
              Share your screen, laugh, and watch with <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-300 to-rose-400">your people.</span>
            </h1>

            <p className="spatial-landing-reveal text-base text-white/60 max-w-xl leading-relaxed">
              Watch YouTube, movies, and browse together with your friends in real time. Just create a room or drop in with a code.
            </p>

            {/* Quick Room Code Join Bar */}
            <form
              onSubmit={handleQuickJoin}
              className="spatial-landing-reveal flex items-center gap-2 p-2 rounded-2xl bg-[#0d0e16]/85 backdrop-blur-2xl border border-white/10 shadow-2xl"
            >
              <div className="flex-1 flex items-center gap-3 px-3 py-1.5">
                <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                <input
                  type="text"
                  maxLength={8}
                  placeholder="ENTER ROOM CODE (e.g. 7K9X2M)"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full bg-transparent text-sm font-mono tracking-widest text-amber-200 placeholder-white/30 focus:outline-none uppercase"
                />
              </div>
              <button
                type="submit"
                disabled={!roomCode.trim()}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black text-xs font-semibold tracking-wide border border-amber-400/30 transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
              >
                <span>Join Room</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Feature Highlights Grid */}
            <div className="spatial-landing-reveal grid grid-cols-3 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.07] backdrop-blur-xl flex flex-col gap-1.5">
                <div className="p-2 w-fit rounded-xl bg-amber-500/15 text-amber-400">
                  <Tv className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-white">Watch Together</span>
                <span className="text-[11px] text-white/45">Stream shows, videos & apps</span>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.07] backdrop-blur-xl flex flex-col gap-1.5">
                <div className="p-2 w-fit rounded-xl bg-rose-500/15 text-rose-400">
                  <Volume2 className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-white">Full Audio</span>
                <span className="text-[11px] text-white/45">Hear every beat together</span>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.07] backdrop-blur-xl flex flex-col gap-1.5">
                <div className="p-2 w-fit rounded-xl bg-indigo-500/15 text-indigo-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-white">Private Room</span>
                <span className="text-[11px] text-white/45">Only your friends can join</span>
              </div>
            </div>
          </div>

          {/* Right Column: Spatial Glass Login / Register Card */}
          <div className="col-span-5 spatial-landing-reveal">
            <div className="relative rounded-3xl bg-[#0d0e16]/90 backdrop-blur-3xl border border-white/[0.1] shadow-[0_20px_60px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.15)] p-8 flex flex-col gap-6">
              
              {/* Tab Selector */}
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => {
                      sound.click();
                      setIsLoginTab(true);
                    }}
                    className={`
                      px-4 py-1.5 rounded-xl text-xs font-medium transition-all
                      ${isLoginTab ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'text-white/60 hover:text-white'}
                    `}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sound.click();
                      setIsLoginTab(false);
                    }}
                    className={`
                      px-4 py-1.5 rounded-xl text-xs font-medium transition-all
                      ${!isLoginTab ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'text-white/60 hover:text-white'}
                    `}
                  >
                    Register
                  </button>
                </div>

                <span className="text-[11px] font-mono text-white/40">
                  {isLoginTab ? 'Welcome Back' : 'Create Account'}
                </span>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                  {errorMsg}
                </div>
              )}

              {googleError && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                  {googleError}
                </div>
              )}

              {/* Google Sign-In */}
              <div className="flex flex-col items-center gap-2">
                <div ref={googleButtonRef} className="w-full flex justify-center min-h-[44px]" />
                <div className="flex items-center gap-3 w-full my-1">
                  <div className="h-px bg-white/10 flex-1" />
                  <span className="text-[11px] font-mono text-white/30 uppercase">or with credentials</span>
                  <div className="h-px bg-white/10 flex-1" />
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
                {!isLoginTab && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono text-white/50 uppercase tracking-wider">Display Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="Your Nickname"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-400/80 transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-white/50 uppercase tracking-wider">
                    {isLoginTab ? 'Email or Username' : 'Email Address'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={isLoginTab ? 'text' : 'email'}
                      required
                      placeholder={isLoginTab ? 'email@example.com or username' : 'email@example.com'}
                      value={emailOrUsername}
                      onChange={(e) => setEmailOrUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-400/80 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-white/50 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-400/80 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 p-1.5 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="mt-2 w-full min-h-[46px] py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-black font-semibold text-xs tracking-wide shadow-[0_4px_25px_rgba(245,158,11,0.35)] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {formLoading ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{isLoginTab ? 'Sign In' : 'Create Account'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 pt-1 text-xs text-white/50">
                  <span>{isLoginTab ? "Don't have an account?" : "Already have an account?"}</span>
                  <button
                    type="button"
                    onClick={() => {
                      sound.click();
                      setIsLoginTab(!isLoginTab);
                      setErrorMsg('');
                    }}
                    className="font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-2 transition-colors"
                  >
                    {isLoginTab ? 'Register now' : 'Sign In'}
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

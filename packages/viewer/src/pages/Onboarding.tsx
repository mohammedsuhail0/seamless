// Agent: 🌐 Agent C (Viewer App Onboarding Page)
// File: packages/viewer/src/pages/Onboarding.tsx

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/auth';
import { ArrowRight } from 'lucide-react';

interface OnboardingProps {
  onNavigate: (page: 'landing' | 'dashboard' | 'room') => void;
  setAuthContext: any;
}

export function Onboarding({ onNavigate, setAuthContext }: OnboardingProps) {
  const { tempGoogleSession, googleOnboard } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // If no temporary Google session, redirect back to landing
  useEffect(() => {
    if (!tempGoogleSession) {
      onNavigate('landing');
    } else {
      // Suggest a username based on email name part
      const emailName = tempGoogleSession.email.split('@')[0];
      setUsername(emailName.replace(/[^a-zA-Z0-9]/g, ''));
    }
  }, [tempGoogleSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempGoogleSession) return;

    setErrorMsg('');
    setFormLoading(true);

    try {
      const result = await googleOnboard(
        username.trim(),
        password,
        tempGoogleSession.tempToken
      );

      if (result.status === 'AUTHENTICATED') {
        setAuthContext(result.user);
        onNavigate('dashboard');
      } else {
        setErrorMsg('Failed to complete onboarding. Please try again.');
      }
    } catch (err: any) {
      let msg = err.error?.message || 'Failed to complete registration.';
      // User-friendly label replacement
      if (msg.toLowerCase().includes('email')) {
        msg = msg.replace(/email/ig, 'Username');
      }
      setErrorMsg(msg);
    } finally {
      setFormLoading(false);
    }
  };

  if (!tempGoogleSession) return null;

  return (
    <div style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      {/* Decorative Radial Glow overlays */}
      <div className="radial-glow" style={{ top: '-10%', left: '-10%' }} />
      <div className="radial-glow" style={{ bottom: '-15%', right: '-10%', background: 'radial-gradient(circle, rgba(124, 58, 237, 0.1) 0%, rgba(0,0,0,0) 70%)' }} />

      <main style={{ maxWidth: '420px', width: '100%', padding: '2rem', zIndex: 1 }}>
        <div className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: 'var(--shadow-lg)', border: '1px solid rgba(255,255,255,0.06)' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>🤝</div>
            <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>Complete Onboarding</h2>
            
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              background: 'rgba(66, 133, 244, 0.1)', 
              border: '1px solid rgba(66, 133, 244, 0.2)', 
              padding: '0.35rem 0.85rem', 
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--text-xs)',
              color: '#8ab4f8',
              marginTop: '0.25rem'
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24">
                <path fill="currentColor" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6c-.28 1.48-1.12 2.73-2.38 3.58v3h3.84c2.25-2.07 3.54-5.12 3.54-8.4z"/>
                <path fill="currentColor" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.84-3c-1.07.72-2.44 1.16-4.12 1.16-3.17 0-5.85-2.14-6.81-5.02H1.26v3.1A11.99 11.99 0 0012 24z"/>
                <path fill="currentColor" d="M5.19 14.23A7.18 7.18 0 014.8 12c0-.79.13-1.56.39-2.23V6.67H1.26A11.99 11.99 0 000 12c0 2.02.5 3.92 1.26 5.66l3.93-3.43z"/>
                <path fill="currentColor" d="M12 4.77c1.76 0 3.34.6 4.59 1.8l3.43-3.43C17.96 1.08 15.24 0 12 0 7.37 0 3.32 2.66 1.26 6.67l3.93 3.43c.96-2.88 3.64-5.02 6.81-5.02z"/>
              </svg>
              <strong>{tempGoogleSession.email}</strong>
            </div>
          </div>

          {errorMsg && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--color-error)', fontSize: 'var(--text-xs)', fontWeight: 500 }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', textAlign: 'center', lineHeight: '1.5' }}>
              Create a unique Username and secure password to finalize your BrowSync account.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>Choose Username (User ID)</label>
              <input 
                type="text" 
                required
                placeholder="e.g. alex_mercer" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-text"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>Create Password</label>
              <input 
                type="password" 
                required
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-text"
              />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Must be at least 8 characters, include 1 uppercase and 1 number
              </span>
            </div>

            <button type="submit" disabled={formLoading} className="btn btn-primary" style={{ padding: '0.8rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              {formLoading ? 'Completing Setup...' : 'Complete Sign Up'} <ArrowRight size={16} />
            </button>

            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={() => onNavigate('landing')}
              style={{ fontSize: 'var(--text-xs)', padding: '0.5rem', width: '100%' }}
            >
              Cancel & Start Over
            </button>
          </form>

        </div>
      </main>
    </div>
  );
}

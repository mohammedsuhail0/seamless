// Agent: 🌐 Agent C (Viewer App Routing Engine)
// File: packages/viewer/src/App.tsx

import { useState, useEffect } from 'react';
import { Landing } from './pages/Landing';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { Room } from './pages/Room';
import './index.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'landing' | 'onboarding' | 'dashboard' | 'room'>('landing');
  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(null);
  const [userContext, setUserContext] = useState<any | null>(null);

  // Sync user context cache and check path routing on mount
  useEffect(() => {
    const cachedUser = localStorage.getItem('browsync_user');
    if (cachedUser) {
      setUserContext(JSON.parse(cachedUser));
    }

    // Direct invite link pathname routing (e.g., /room/38XTER)
    const path = window.location.pathname;
    const match = path.match(/^\/room\/([A-Za-z0-9]{6})$/);
    if (match && match[1]) {
      const code = match[1].toUpperCase();
      console.log('🔗 Direct room invite link detected:', code);
      setCurrentRoomCode(code);
      setCurrentPage('room');
    }
  }, []);

  const handleNavigate = (page: 'landing' | 'onboarding' | 'dashboard' | 'room', contextCode?: string) => {
    if (page === 'room' && contextCode) {
      setCurrentRoomCode(contextCode);
    }
    setCurrentPage(page);
  };

  // Perform route displays
  switch (currentPage) {
    case 'dashboard':
      return (
        <Dashboard 
          userContext={userContext} 
          onNavigate={handleNavigate} 
        />
      );
    case 'onboarding':
      return (
        <Onboarding
          setAuthContext={setUserContext}
          onNavigate={handleNavigate}
        />
      );
    case 'room':
      return (
        <Room 
          roomCode={currentRoomCode || ''} 
          userContext={userContext} 
          onNavigate={handleNavigate} 
        />
      );
    case 'landing':
    default:
      return (
        <Landing 
          setAuthContext={setUserContext} 
          onNavigate={handleNavigate} 
        />
      );
  }
}


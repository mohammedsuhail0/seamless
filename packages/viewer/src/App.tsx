// Agent: 🌐 Agent C (Viewer App Routing Engine - Spatial Vision-OS Edition)
// File: packages/viewer/src/App.tsx

import { useState, useEffect } from 'react';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Room } from './pages/Room';
import { AmbientBackground } from './components/AmbientBackground';
import { DynamicIsland } from './components/DynamicIsland';
import { Preloader } from './components/Preloader';
import { useAuthStore } from './stores/auth';
import api from './lib/api';
import './index.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'landing' | 'dashboard' | 'room'>('landing');
  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(null);
  const [userContext, setUserContext] = useState<any | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const { logout } = useAuthStore();

  // Sync user context cache, warmup backend, and check path routing on mount
  useEffect(() => {
    api.warmup();

    const cachedUser = localStorage.getItem('brosync_user') || localStorage.getItem('browsync_user');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        setUserContext(parsed);
        setCurrentPage((current) => current === 'room' ? current : 'dashboard');
      } catch {
        localStorage.removeItem('brosync_user');
        localStorage.removeItem('browsync_user');
      }
    }

    // Direct invite link pathname routing (e.g., /room/38XTER)
    const path = window.location.pathname;
    const match = path.match(/^\/room\/([A-Za-z0-9]{4,8})$/);
    if (match && match[1]) {
      const code = match[1].toUpperCase();
      console.log('🔗 Direct room invite link detected:', code);
      setCurrentRoomCode(code);
      setCurrentPage('room');
    }
  }, []);

  const handleNavigate = (page: 'landing' | 'dashboard' | 'room', contextCode?: string) => {
    if (page === 'room' && contextCode) {
      setCurrentRoomCode(contextCode);
    }
    setCurrentPage(page);
  };

  const handleLogout = async () => {
    await logout();
    setUserContext(null);
    setCurrentPage('landing');
  };

  const renderActiveScreen = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard 
            userContext={userContext} 
            onNavigate={handleNavigate} 
            setAuthContext={setUserContext}
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
  };

  return (
    <>
      {isAppLoading && (
        <Preloader
          onComplete={() => setIsAppLoading(false)}
          message="Together in real-time"
        />
      )}
      <AmbientBackground>
        {currentPage !== 'room' && (
          <DynamicIsland
            currentView={currentPage}
            onNavigate={handleNavigate}
            user={userContext}
            onLogout={handleLogout}
            roomCode={currentRoomCode || undefined}
            onQuickJoin={(code) => handleNavigate('room', code)}
          />
        )}
        {renderActiveScreen()}
      </AmbientBackground>
    </>
  );
}

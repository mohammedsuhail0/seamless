// Agent: 🌐 Agent C (Viewer App Routing Engine)
// File: packages/viewer/src/App.tsx

import { useState, useEffect } from 'react';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Room } from './pages/Room';
import './index.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'landing' | 'dashboard' | 'room'>('landing');
  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(null);
  const [userContext, setUserContext] = useState<any | null>(null);

  // Sync user context cache on mount
  useEffect(() => {
    const cachedUser = localStorage.getItem('browsync_user');
    if (cachedUser) {
      setUserContext(JSON.parse(cachedUser));
    }
  }, []);

  const handleNavigate = (page: 'landing' | 'dashboard' | 'room', contextCode?: string) => {
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

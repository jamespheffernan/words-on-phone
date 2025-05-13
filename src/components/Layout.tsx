import React, { useState, useEffect, useCallback } from 'react';
import Game from './Game';
import Settings from './Settings';
import Stats from './Stats';
import GameResults from './GameResults';
import { useGameStore, GameView } from '../store/gameStore';

interface LayoutProps {
  darkMode: boolean;
  onToggleDarkMode: (enabled: boolean) => void;
}

const Layout: React.FC<LayoutProps> = ({ darkMode, onToggleDarkMode }) => {
  const [activeTab, setActiveTab] = useState<'game' | 'settings' | 'stats'>('game');
  
  // Use individual selectors to prevent unnecessary re-renders
  const currentView = useGameStore(state => state.currentView);
  const isInitialized = useGameStore(state => state.isInitialized);
  const initialize = useGameStore(state => state.initialize);
  
  // Memoize tab change handler
  const handleTabChange = useCallback((tab: 'game' | 'settings' | 'stats') => {
    setActiveTab(tab);
  }, []);
  
  // Initialize game state on component mount
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);
  
  // Render the game results view if currentView is RESULTS
  if (currentView === GameView.RESULTS) {
    return <GameResults />;
  }

  // Memoize the tab class function to prevent recreating on every render
  const getTabClasses = useCallback((isActive: boolean) => {
    return `flex-1 py-3 font-medium text-center ${
      isActive
        ? `${darkMode ? 'text-blue-400 border-blue-400' : 'text-blue-600 border-blue-600'} border-b-2`
        : `${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
    }`;
  }, [darkMode]);

  return (
    <div className={`max-w-md w-full ${darkMode ? 'text-white' : 'text-gray-800'}`}>
      {/* Tabs */}
      <div className={`flex border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} mb-6`}>
        <button
          onClick={() => handleTabChange('game')}
          className={getTabClasses(activeTab === 'game')}
        >
          Game
        </button>
        <button
          onClick={() => handleTabChange('settings')}
          className={getTabClasses(activeTab === 'settings')}
        >
          Settings
        </button>
        <button
          onClick={() => handleTabChange('stats')}
          className={getTabClasses(activeTab === 'stats')}
        >
          Stats
        </button>
      </div>
      
      {/* Content */}
      {activeTab === 'game' && <Game darkMode={darkMode} />}
      {activeTab === 'settings' && <Settings darkMode={darkMode} onToggleDarkMode={onToggleDarkMode} />}
      {activeTab === 'stats' && <Stats darkMode={darkMode} />}
    </div>
  );
};

export default Layout; 
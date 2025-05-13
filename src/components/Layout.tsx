import React, { useState } from 'react';
import Game from './Game';
import Settings from './Settings';

const Layout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'game' | 'settings'>('game');

  return (
    <div className="max-w-md w-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('game')}
          className={`flex-1 py-3 font-medium text-center ${
            activeTab === 'game'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Game
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-3 font-medium text-center ${
            activeTab === 'settings'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Settings
        </button>
      </div>
      
      {/* Content */}
      {activeTab === 'game' ? <Game /> : <Settings />}
    </div>
  );
};

export default Layout; 
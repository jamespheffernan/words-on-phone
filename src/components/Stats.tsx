import React, { useState, useEffect } from 'react';
import { getGameStats } from '../utils/storage';

interface GameStats {
  totalGames: number;
  phrasesPlayed: number;
  lastPlayed: Date;
  averagePhrasesPerGame?: number;
  totalPlayTime?: number;
  topPhrases?: Array<{ phrase: string; timesPlayed: number }>;
}

interface StatsProps {
  darkMode: boolean;
}

const Stats: React.FC<StatsProps> = ({ darkMode }) => {
  const [stats, setStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    // Load stats when component mounts
    const loadStats = async () => {
      try {
        const gameStats = await getGameStats();
        setStats(gameStats);
      } catch (error) {
        console.error('Failed to load game stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadStats();
  }, []);
  
  // Format date for display
  const formatDate = (date: Date) => {
    if (!date || date.getTime() === 0) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Format time in minutes and seconds
  const formatPlayTime = (seconds: number) => {
    if (!seconds) return '0m 0s';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };
  
  if (loading) {
    return (
      <div className={`p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md flex justify-center items-center`}>
        <div className={`animate-pulse ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading stats...</div>
      </div>
    );
  }
  
  if (!stats) {
    return (
      <div className={`p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md`}>
        <p className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No statistics available</p>
      </div>
    );
  }
  
  return (
    <div className={`p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md`}>
      <h2 className={`text-xl font-bold text-center ${darkMode ? 'text-white' : 'text-gray-800'} mb-4`}>Game Statistics</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className={`${darkMode ? 'bg-blue-900 border-blue-800' : 'bg-blue-50 border-blue-100'} p-4 rounded-lg border`}>
          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>Total Games</p>
          <p className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>{stats.totalGames}</p>
        </div>
        
        <div className={`${darkMode ? 'bg-green-900 border-green-800' : 'bg-green-50 border-green-100'} p-4 rounded-lg border`}>
          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>Phrases Played</p>
          <p className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>{stats.phrasesPlayed}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        {stats.averagePhrasesPerGame !== undefined && (
          <div className={`${darkMode ? 'bg-purple-900 border-purple-800' : 'bg-purple-50 border-purple-100'} p-4 rounded-lg border`}>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>Avg Phrases/Game</p>
            <p className={`text-2xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>{stats.averagePhrasesPerGame}</p>
          </div>
        )}
        
        {stats.totalPlayTime !== undefined && (
          <div className={`${darkMode ? 'bg-amber-900 border-amber-800' : 'bg-amber-50 border-amber-100'} p-4 rounded-lg border`}>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>Total Play Time</p>
            <p className={`text-2xl font-bold ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>{formatPlayTime(stats.totalPlayTime)}</p>
          </div>
        )}
      </div>
      
      <div className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} p-4 rounded-lg border mb-6`}>
        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>Last Played</p>
        <p className={`text-lg font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{formatDate(stats.lastPlayed)}</p>
      </div>
      
      {stats.topPhrases && stats.topPhrases.length > 0 && (
        <div className="mt-6">
          <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'} mb-3`}>Top Phrases</h3>
          <div className={`${darkMode ? 'bg-gray-700' : 'bg-white'} border ${darkMode ? 'border-gray-600' : 'border-gray-200'} rounded-lg overflow-hidden`}>
            <table className="w-full">
              <thead className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase`}>
                <tr>
                  <th className="px-4 py-2 text-left">Phrase</th>
                  <th className="px-4 py-2 text-right">Times Played</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-100'}`}>
                {stats.topPhrases.map((phrase, index) => (
                  <tr key={index} className={index % 2 === 0 
                    ? darkMode ? 'bg-gray-700' : 'bg-white' 
                    : darkMode ? 'bg-gray-800' : 'bg-gray-50'
                  }>
                    <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'} font-medium`}>{phrase.phrase}</td>
                    <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-700'} text-right`}>{phrase.timesPlayed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stats; 
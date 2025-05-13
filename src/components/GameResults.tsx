import React, { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { vibrate, vibrateSuccess, ImpactStyle } from '../utils/haptics';
import { getDarkMode } from '../utils/storage';

const GameResults: React.FC = () => {
  // Use individual selectors to prevent infinite loops
  const usedPhrases = useGameStore(state => state.usedPhrases);
  const gameTime = useGameStore(state => state.gameTime);
  const startNewGame = useGameStore(state => state.startNewGame);
  const goToHome = useGameStore(state => state.goToHome);
  
  const [darkMode, setDarkMode] = useState(false);
  
  // Load dark mode preference
  useEffect(() => {
    const loadDarkMode = async () => {
      try {
        const isDarkMode = await getDarkMode();
        setDarkMode(isDarkMode);
      } catch (error) {
        console.error('Failed to load dark mode preference:', error);
      }
    };
    
    loadDarkMode();
  }, []);

  // Format time in minutes and seconds
  const formatGameTime = useCallback((seconds: number) => {
    if (!seconds) return '0m 0s';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  }, []);
  
  // Handle play again with haptics
  const handlePlayAgain = useCallback(async () => {
    await vibrateSuccess();
    startNewGame();
  }, [startNewGame]);
  
  // Handle go to home with haptics
  const handleGoToHome = useCallback(async () => {
    await vibrate(ImpactStyle.Light);
    goToHome();
  }, [goToHome]);

  return (
    <div className={`p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md max-w-md w-full`}>
      <div className="text-center mb-6">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'} mb-2`}>Game Complete!</h2>
        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Well done everyone!</p>
      </div>

      {usedPhrases && usedPhrases.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className={`${darkMode ? 'bg-blue-900 border-blue-800' : 'bg-blue-50 border-blue-100'} p-4 rounded-lg border text-center`}>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>Phrases</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>{usedPhrases.length}</p>
            </div>
            
            <div className={`${darkMode ? 'bg-purple-900 border-purple-800' : 'bg-purple-50 border-purple-100'} p-4 rounded-lg border text-center`}>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>Game Time</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>{formatGameTime(gameTime)}</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} mb-2`}>Phrases Played:</h3>
            <ul className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} rounded-lg border divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
              {usedPhrases.map((phrase, index) => (
                <li key={index} className={`p-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {phrase}
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div className={`p-4 mb-6 ${darkMode ? 'bg-yellow-800 border-yellow-700' : 'bg-yellow-50 border-yellow-200'} rounded-lg text-center border`}>
          <p className={`${darkMode ? 'text-yellow-200' : 'text-yellow-700'}`}>No phrases were played in this game.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={handlePlayAgain}
          className="py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
        >
          Play Again
        </button>
        
        <button
          onClick={handleGoToHome}
          className="py-3 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default GameResults; 
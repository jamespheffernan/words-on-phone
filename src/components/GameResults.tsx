import React, { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { vibrate, vibrateSuccess, ImpactStyle } from '../utils/haptics';
import { getDarkMode } from '../utils/storage';
import QRShare from './QRShare';

const GameResults: React.FC = () => {
  // Use individual selectors to prevent infinite loops
  const usedPhrases = useGameStore(state => state.usedPhrases);
  const gameTime = useGameStore(state => state.gameTime);
  const startNewGame = useGameStore(state => state.startNewGame);
  const goToHome = useGameStore(state => state.goToHome);
  const score = useGameStore(state => state.score);
  
  const [darkMode, setDarkMode] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  
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
    vibrateSuccess();
    startNewGame();
  }, [startNewGame]);
  
  // Handle go to home with haptics
  const handleGoToHome = useCallback(async () => {
    vibrate(ImpactStyle.Light);
    goToHome();
  }, [goToHome]);
  
  // Handle sharing app
  const handleShareApp = useCallback(async () => {
    vibrate(ImpactStyle.Light);
    setShowQRModal(true);
  }, []);

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
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>Score</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>{score}</p>
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

      <div className="mb-4">
        <button
          onClick={handleShareApp}
          className={`w-full mb-4 py-2 px-4 rounded-lg flex items-center justify-center ${
            darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'
          } text-white font-medium`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share App
        </button>
      </div>

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
      
      {/* QR Code Modal */}
      {showQRModal && (
        <QRShare 
          darkMode={darkMode} 
          onClose={() => setShowQRModal(false)} 
        />
      )}
    </div>
  );
};

export default GameResults; 
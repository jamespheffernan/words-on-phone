import React, { useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { vibrate, vibrateSuccess, vibrateError, HapticsImpactStyle } from '../utils/haptics';

interface GameProps {
  darkMode: boolean;
}

const Game: React.FC<GameProps> = ({ darkMode }) => {
  // Use separate selectors for better performance and to prevent infinite loops
  const isGameRunning = useGameStore(state => state.isGameRunning);
  const currentPhrase = useGameStore(state => state.currentPhrase);
  const usedPhrases = useGameStore(state => state.usedPhrases);
  const startGame = useGameStore(state => state.startGame);
  const stopGame = useGameStore(state => state.stopGame);
  const getRandomPhrase = useGameStore(state => state.getRandomPhrase);

  // Function to handle start game with haptic feedback
  const handleStartGame = useCallback(async () => {
    await vibrate(HapticsImpactStyle.Medium);
    startGame();
  }, [startGame]);

  // Function to handle next phrase button
  const handleNextPhrase = useCallback(async () => {
    // Haptic feedback
    await vibrateSuccess();
    
    // Get a new random phrase and add it to used phrases
    const nextPhrase = getRandomPhrase();
    
    // Update state with the new phrase
    // Using a function to ensure we're using the latest state
    useGameStore.setState(state => ({
      currentPhrase: nextPhrase,
      usedPhrases: [...state.usedPhrases, nextPhrase]
    }));
  }, [getRandomPhrase]);
  
  // Function to handle end game
  const handleEndGame = useCallback(async () => {
    await vibrateError();
    stopGame();
  }, [stopGame]);

  return (
    <div className={`p-8 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md max-w-md w-full`}>
      {!isGameRunning ? (
        <div className="text-center">
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'} mb-6`}>Ready to Play?</h2>
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
            Pass the phone around and act out the phrases before time runs out!
          </p>
          <button
            onClick={handleStartGame}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
          >
            Start Game
          </button>
        </div>
      ) : (
        <div className="text-center">
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'} mb-4`}>Your Phrase:</h2>
          <div className={`p-6 ${darkMode ? 'bg-blue-900 border-blue-800' : 'bg-blue-50 border-blue-200'} rounded-lg border-2 mb-6`}>
            <p className={`text-2xl font-bold ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>{currentPhrase}</p>
          </div>
          
          <div className="mb-8">
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
              Act it out! Pass the phone when you're done!
            </p>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Phrases played this game: {usedPhrases?.length || 0}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleNextPhrase}
              className="py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75"
            >
              Next Phrase
            </button>
            
            <button
              onClick={handleEndGame}
              className="py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
            >
              End Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game; 
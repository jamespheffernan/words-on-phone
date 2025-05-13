import React from 'react';
import { useGameStore } from '../store/gameStore';

const Game: React.FC = () => {
  const { isGameRunning, currentPhrase, startGame, stopGame } = useGameStore(state => ({
    isGameRunning: state.isGameRunning,
    currentPhrase: state.currentPhrase,
    startGame: state.startGame,
    stopGame: state.stopGame,
  }));

  return (
    <div className="p-8 bg-white rounded-lg shadow-md max-w-md w-full">
      {!isGameRunning ? (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Ready to Play?</h2>
          <p className="text-gray-600 mb-6">
            Pass the phone around and act out the phrases before time runs out!
          </p>
          <button
            onClick={startGame}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
          >
            Start Game
          </button>
        </div>
      ) : (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Phrase:</h2>
          <div className="p-6 bg-blue-50 rounded-lg border-2 border-blue-200 mb-6">
            <p className="text-2xl font-bold text-blue-800">{currentPhrase}</p>
          </div>
          <p className="text-gray-600 mb-6">
            Act it out! Pass the phone when you're done!
          </p>
          <button
            onClick={stopGame}
            className="w-full py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
          >
            Stop Game
          </button>
        </div>
      )}
    </div>
  );
};

export default Game; 
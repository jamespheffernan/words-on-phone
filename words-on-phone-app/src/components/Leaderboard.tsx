import React from 'react';
import { useGameStore, type AllTimeEntry } from '../store';
import { useHaptics } from '../hooks/useHaptics';
import './Leaderboard.css';

interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ isOpen, onClose }) => {
  const { allTimeLeaderboard, clearAllTimeLeaderboard } = useGameStore();
  const { triggerHaptic } = useHaptics();

  if (!isOpen) return null;

  const handleClose = () => {
    triggerHaptic('ui', 'menu-close');
    onClose();
  };

  const handleClearLeaderboard = () => {
    if (window.confirm('Are you sure you want to clear all leaderboard entries?')) {
      triggerHaptic('ui', 'button-tap');
      clearAllTimeLeaderboard();
    }
  };


  return (
    <div className="modal-overlay">
      <div className="leaderboard-modal">
        <div className="modal-header">
          <h2>🏆 Leaderboard</h2>
          <button className="close-button" onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </div>
        
        <div className="modal-body">
          {allTimeLeaderboard.length === 0 ? (
            <div className="empty-leaderboard">
              <p>No scores yet! Play solo mode to get on the leaderboard.</p>
            </div>
          ) : (
            <div className="leaderboard-list">
              {allTimeLeaderboard.map((entry, index) => (
                <AllTimeLeaderboardItem 
                  key={entry.id} 
                  entry={entry} 
                  rank={index + 1} 
                />
              ))}
            </div>
          )}
        </div>

        {allTimeLeaderboard.length > 0 && (
          <div className="modal-actions">
            <button 
              className="clear-button"
              onClick={handleClearLeaderboard}
            >
              Clear All
            </button>
            <button 
              className="close-action-button"
              onClick={handleClose}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface AllTimeLeaderboardItemProps {
  entry: AllTimeEntry;
  rank: number;
}

const AllTimeLeaderboardItem: React.FC<AllTimeLeaderboardItemProps> = ({ entry, rank }) => {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const formatTime = (timeMs: number) => {
    return `${(timeMs / 1000).toFixed(1)}s`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className={`leaderboard-item ${rank <= 3 ? 'top-three' : ''}`}>
      <div className="rank-section">
        <span className="rank">{getRankIcon(rank)}</span>
      </div>
      
      <div className="player-section">
        <div className="player-name">{entry.playerName}</div>
        <div className="player-date">{formatDate(entry.date)}</div>
      </div>
      
      <div className="stats-section">
        <div className="main-stats">
          <div className="score-stat">
            <span className="stat-value">{entry.score}</span>
            <span className="stat-label">correct</span>
          </div>
        </div>
        
        {(entry.fastestAnswer || entry.slowestAnswer) && (
          <div className="time-stats">
            {entry.fastestAnswer && (
              <div className="time-stat fastest">
                ⚡ {formatTime(entry.fastestAnswer.timeMs)}
              </div>
            )}
            {entry.slowestAnswer && (
              <div className="time-stat slowest">
                🐌 {formatTime(entry.slowestAnswer.timeMs)}
              </div>
            )}
          </div>
        )}
        
        {entry.categories.length > 0 && (
          <div className="categories">
            {entry.categories.slice(0, 3).map((category, index) => (
              <span key={index} className="category-tag">
                {category}
              </span>
            ))}
            {entry.categories.length > 3 && (
              <span className="category-tag more">+{entry.categories.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
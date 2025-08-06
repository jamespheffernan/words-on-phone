import React, { useState } from 'react';
import { useHaptics } from '../hooks/useHaptics';
import './PlayerNameModal.css';

interface PlayerNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  title?: string;
  message?: string;
  initialName?: string;
}

export const PlayerNameModal: React.FC<PlayerNameModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Enter Your Name",
  message = "What should we call you on the leaderboard?",
  initialName = ""
}) => {
  const [name, setName] = useState(initialName);
  const { triggerHaptic } = useHaptics();
  
  if (!isOpen) return null;

  const handleConfirm = () => {
    const trimmedName = name.trim();
    if (trimmedName) {
      triggerHaptic('ui', 'button-tap');
      onConfirm(trimmedName);
      onClose();
    }
  };

  const handleCancel = () => {
    triggerHaptic('ui', 'button-tap');
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="player-name-modal">
        <div className="modal-header">
          <h2>{title}</h2>
        </div>
        
        <div className="modal-body">
          <p>{message}</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Your name..."
            maxLength={20}
            autoFocus
            className="name-input"
          />
        </div>

        <div className="modal-actions">
          <button
            className="cancel-button"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className="confirm-button"
            onClick={handleConfirm}
            disabled={!name.trim()}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};
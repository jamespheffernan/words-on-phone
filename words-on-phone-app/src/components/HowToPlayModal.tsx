import React from 'react';
import './HowToPlayModal.css';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          ✕
        </button>
        
        <h2 className="modal-title">How to Play Words on Phone</h2>
        
        <div className="modal-body">
          <p className="modal-intro">
            You're basically playing verbal hot-potato: teams race to make teammates guess a hidden phrase 
            while a secret countdown ticks; when the buzzer explodes, whichever team is still holding the 
            phone loses that round.
          </p>

          <section className="rules-section">
            <h3>Setup</h3>
            <ol>
              <li>Form two teams of roughly even size and sit or stand in an alternating circle so you're not next to your own teammates.</li>
              <li>Choose a category (or "Everything") and a buzzer sound; the app's library holds 7,000-plus phrases split across ten themed lists.</li>
              <li>Pick a starting player to hold the phone; that player's screen will show the first phrase while the timer (30–90 s, hidden) starts automatically.</li>
            </ol>
          </section>

          <section className="rules-section">
            <h3>Turn-by-turn play</h3>
            <ol>
              <li>
                Give clues so your own team—and only your team—can shout the exact phrase.
                <ul>
                  <li>You may talk, gesture, or use synonyms.</li>
                  <li>You may not say any word in the phrase, spell it, give its first letter, or use rhymes.</li>
                </ul>
              </li>
              <li>When your team guesses correctly, tap to reveal the next phrase and immediately hand the phone to the player on the other team to keep the hot-potato moving.</li>
              <li>Play continues—guess, tap, pass—until the hidden timer hits zero and the buzzer sounds.</li>
            </ol>
          </section>

          <section className="rules-section">
            <h3>End of a round & scoring</h3>
            <ul>
              <li>If the buzzer sounds while you're holding the phone, your team loses the round.</li>
              <li>The opposing team gains one point; most groups play to 7 points, but you can set any target or just tally wins manually (the app itself doesn't enforce a score limit).</li>
            </ul>
          </section>

          <section className="rules-section">
            <h3>Optional settings & house rules</h3>
            <table className="settings-table">
              <thead>
                <tr>
                  <th>Option in the app</th>
                  <th>What it changes</th>
                  <th>Typical house tweak</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Timer slider</td>
                  <td>30 – 90 s hidden countdown</td>
                  <td>Shorten for higher tension</td>
                </tr>
                <tr>
                  <td>Category picker</td>
                  <td>One list or "Everything"</td>
                  <td>Agree a "skip" penalty for tricky phrases</td>
                </tr>
                <tr>
                  <td>Buzzer sound</td>
                  <td>20 quirky SFX</td>
                  <td>Random "surprise" buzzer for laughs</td>
                </tr>
              </tbody>
            </table>
            <p className="house-rules-note">
              All other party-game customs—e.g., standing up to pass faster, imposing drink/penalty tasks, 
              or adding gesture-only rounds—are fair game as long as everyone agrees before you start.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}; 
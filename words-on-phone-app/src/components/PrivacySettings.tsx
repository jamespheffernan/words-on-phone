import React, { useState, useEffect } from 'react';
import { analytics } from '../services/analytics';
import './PrivacySettings.css';

interface PrivacySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacySettings: React.FC<PrivacySettingsProps> = ({ isOpen, onClose }) => {
  const [isOptedOut, setIsOptedOut] = useState(false);
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsOptedOut(analytics.getOptOutStatus());
      setAnonymousId(analytics.getAnonymousId());
    }
  }, [isOpen]);

  const handleOptOutToggle = () => {
    const newOptOutStatus = !isOptedOut;
    setIsOptedOut(newOptOutStatus);
    analytics.setOptOut(newOptOutStatus);
    
    // Track the settings change (if not opted out)
    if (!newOptOutStatus) {
      analytics.track('setting_changed', {
        settingName: 'analytics_opt_out',
        previousValue: !newOptOutStatus,
        newValue: newOptOutStatus
      });
    }
  };

  const handleResetId = () => {
    const newId = analytics.resetAnonymousId();
    setAnonymousId(newId);
    
    if (!isOptedOut) {
      analytics.track('setting_changed', {
        settingName: 'anonymous_id_reset',
        previousValue: 'old_id',
        newValue: 'new_id'
      });
    }
  };

  const handleClearData = () => {
    analytics.clearStoredData();
    setIsOptedOut(false);
    setAnonymousId(analytics.getAnonymousId());
    setShowConfirmClear(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content privacy-settings" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Privacy Settings</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          <div className="privacy-section">
            <h3>Analytics & Data Collection</h3>
            <p className="privacy-description">
              <strong>Optional & Anonymous:</strong> We collect anonymous usage data to improve the game experience. 
              This includes gameplay statistics (which categories you play, success rates), feature usage patterns, 
              and performance metrics (load times, error detection). 
              <strong>No personal information is ever collected</strong> - we cannot and do not identify individual users.
            </p>
            
            <div className="privacy-note privacy-note-info">
              <p><strong>💡 Your Control:</strong> Analytics help us understand what features players enjoy most and identify bugs to fix. 
              You can disable this anytime - all app features work exactly the same whether analytics is on or off.</p>
            </div>
            
            <div className="privacy-toggle">
              <label className="toggle-container">
                <input
                  type="checkbox"
                  checked={!isOptedOut}
                  onChange={handleOptOutToggle}
                  data-testid="analytics-toggle"
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">
                  {isOptedOut ? 'Analytics Disabled' : 'Analytics Enabled'}
                </span>
              </label>
            </div>
            
            {isOptedOut && (
              <div className="privacy-notice">
                <p>✓ Analytics are disabled. No usage data is being collected.</p>
              </div>
            )}
          </div>

          <div className="privacy-section">
            <h3>Anonymous Identifier</h3>
            <p className="privacy-description">
              <strong>What is this?</strong> Your anonymous ID (like a random code) helps us group your usage data together 
              to understand player behavior patterns. <strong>This ID cannot be linked to your personal identity</strong> - 
              it's just a random string that lets us see usage trends without knowing who you are.
            </p>
            
            <div className="privacy-note privacy-note-info">
              <p><strong>🔄 Reset Anytime:</strong> Generate a new random ID to completely reset your analytics tracking. 
              This is useful if you share a device or want to start fresh with a new anonymous identity.</p>
            </div>
            
            <div className="anonymous-id-display">
              <code className="anonymous-id">{anonymousId}</code>
              <button 
                className="reset-id-button"
                onClick={handleResetId}
                disabled={isOptedOut}
                data-testid="reset-id-button"
              >
                Generate New ID
              </button>
            </div>
          </div>

          <div className="privacy-section">
            <h3>Data Management</h3>
            <p className="privacy-description">
              <strong>Complete Reset:</strong> Remove all analytics-related data stored on your device. 
              This includes your privacy preferences, anonymous ID, and any locally stored analytics data. 
              <strong>Your game settings and progress are not affected.</strong>
            </p>
            
            <div className="privacy-note privacy-note-warning">
              <p><strong>⚠️ Note:</strong> This only clears data stored on your device. Analytics data already sent 
              to our systems cannot be individually deleted (as required for anonymous aggregated analytics), 
              but it cannot be traced back to you personally.</p>
            </div>
            
            {!showConfirmClear ? (
              <button 
                className="clear-data-button"
                onClick={() => setShowConfirmClear(true)}
                data-testid="clear-data-button"
              >
                Clear All Analytics Data
              </button>
            ) : (
              <div className="confirm-clear">
                <p className="warning-text">
                  ⚠️ This will permanently delete all stored analytics data. This action cannot be undone.
                </p>
                <div className="confirm-buttons">
                  <button 
                    className="confirm-button"
                    onClick={handleClearData}
                    data-testid="confirm-clear-button"
                  >
                    Yes, Clear Data
                  </button>
                  <button 
                    className="cancel-button"
                    onClick={() => setShowConfirmClear(false)}
                    data-testid="cancel-clear-button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="privacy-section">
            <h3>What Data We Collect</h3>
            <ul className="data-collection-list">
              <li>Game performance and usage statistics</li>
              <li>Feature interaction and navigation patterns</li>
              <li>Error logs and crash reports</li>
              <li>Device and browser information (for compatibility)</li>
              <li>Gameplay duration and category preferences</li>
            </ul>
            
            <div className="privacy-note">
              <p><strong>📊 Example Analytics Events:</strong></p>
              <ul className="privacy-example-list">
                <li>"User started a Movies & TV game with hidden timer"</li>
                <li>"Game lasted 65 seconds with 8 correct answers"</li>
                <li>"User opened Privacy Settings from main menu"</li>
                <li>"Audio system took 120ms to initialize successfully"</li>
              </ul>
            </div>
            
            <div className="privacy-note privacy-note-secure">
              <p><strong>🔒 We NEVER collect:</strong> Personal information, names, emails, contacts, 
              location data, photos, browsing history, or anything that can identify you personally. 
              All data is anonymous and aggregated.</p>
            </div>
          </div>

          <div className="privacy-section">
            <h3>Additional Resources</h3>
            <div className="privacy-links">
              <div className="privacy-link-item">
                <strong>📄 Full Privacy Policy</strong>
                <p>Complete details about our privacy practices and your rights</p>
                <span className="privacy-link-note">Available in the app's documentation</span>
              </div>
              
              <div className="privacy-link-item">
                <strong>🤖 PostHog Analytics</strong>
                <p>We use PostHog, a privacy-focused analytics platform that respects user rights</p>
                <span className="privacy-link-note">Learn more at posthog.com/privacy</span>
              </div>
              
              <div className="privacy-link-item">
                <strong>📧 Questions or Concerns?</strong>
                <p>If you have questions about analytics or privacy, you can:</p>
                <ul className="privacy-contact-list">
                  <li>Disable analytics using the toggle above</li>
                  <li>Check the project's documentation for technical details</li>
                  <li>Contact us through the app's support channels</li>
                </ul>
              </div>
            </div>
            
            <div className="privacy-note privacy-note-final">
              <p><strong>🛡️ Your Privacy Promise:</strong> Your privacy is completely under your control. 
              Analytics help us make the game better, but they're entirely optional. You can disable them 
              anytime with one click, and all game features work exactly the same either way.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 
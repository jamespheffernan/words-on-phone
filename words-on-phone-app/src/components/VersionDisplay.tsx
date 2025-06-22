import React, { useState } from 'react';
import './VersionDisplay.css';

interface VersionDisplayProps {
  className?: string;
}

export const VersionDisplay: React.FC<VersionDisplayProps> = ({ className = '' }) => {
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);

  const version = __APP_VERSION__;
  const versionInfo = __APP_VERSION_INFO__;

  const handleVersionClick = async () => {
    try {
      const fullVersionInfo = `Version: ${versionInfo.version}\nBuild Date: ${versionInfo.buildDate}\nCommit: ${versionInfo.gitHash}\nCommit Date: ${versionInfo.commitDate}`;
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullVersionInfo);
        setShowCopyFeedback(true);
        setTimeout(() => setShowCopyFeedback(false), 2000);
      } else {
        // Fallback for older browsers
        console.log('Version Info:', fullVersionInfo);
      }
    } catch (error) {
      console.warn('Failed to copy version info:', error);
    }
  };

  return (
    <div className={`version-display ${className}`.trim()}>
      <button
        className="version-button"
        onClick={handleVersionClick}
        aria-label={`App version ${version}. Click to copy version details.`}
        title="Click to copy version information"
      >
        {version}
      </button>
      {showCopyFeedback && (
        <div className="copy-feedback" role="status" aria-live="polite">
          Copied!
        </div>
      )}
    </div>
  );
}; 
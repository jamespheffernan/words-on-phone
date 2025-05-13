import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { vibrate, ImpactStyle } from '../utils/haptics';

interface QRShareProps {
  darkMode: boolean;
  onClose: () => void;
}

const QRShare: React.FC<QRShareProps> = ({ darkMode, onClose }) => {
  const [copied, setCopied] = useState(false);
  const appUrl = 'https://words-on-phone.netlify.app';
  
  // Handle copy link to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      vibrate(ImpactStyle.Light);
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };
  
  // Handle close with haptic feedback
  const handleClose = async () => {
    vibrate(ImpactStyle.Light);
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className={`p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-sm w-full mx-4`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Share Words on Phone</h2>
          <button 
            onClick={handleClose}
            className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className={`text-center p-4 mb-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
          <div className="flex justify-center mb-4">
            <div className={`p-3 bg-white rounded-lg inline-block`}>
              <QRCodeSVG value={appUrl} size={200} />
            </div>
          </div>
          
          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
            Scan this code to open Words on Phone
          </p>
          
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {appUrl}
          </p>
        </div>
        
        <div className="flex flex-col space-y-3">
          <button
            onClick={handleCopyLink}
            className={`py-2 px-4 rounded-lg flex items-center justify-center ${
              darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
            } text-white font-medium transition-colors`}
          >
            {copied ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy Link
              </>
            )}
          </button>
          
          {navigator.share && (
            <button
              onClick={async () => {
                try {
                  await navigator.share({
                    title: 'Words on Phone',
                    text: 'Check out this fun word game!',
                    url: appUrl
                  });
                  vibrate(ImpactStyle.Light);
                } catch (error) {
                  console.error('Error sharing:', error);
                }
              }}
              className={`py-2 px-4 rounded-lg flex items-center justify-center ${
                darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'
              } text-white font-medium transition-colors`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRShare; 
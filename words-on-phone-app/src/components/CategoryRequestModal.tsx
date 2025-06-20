import React, { useState, useEffect } from 'react';
import './CategoryRequestModal.css';
import { detectActiveAIService, getAIServiceDisplayName, getAIServiceEmoji, type AIService } from '../config/environment';

interface CategoryRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestCategory: (categoryName: string) => Promise<string[]>;
  onConfirmGeneration: (categoryName: string, sampleWords: string[]) => Promise<void>;
}

interface RequestState {
  phase: 'input' | 'confirming' | 'generating' | 'success' | 'error';
  categoryName: string;
  sampleWords: string[];
  error: string;
  generatedCount: number;
  aiService: AIService | null;
  detectingService: boolean;
}

export const CategoryRequestModal: React.FC<CategoryRequestModalProps> = ({
  isOpen,
  onClose,
  onRequestCategory,
  onConfirmGeneration
}) => {
  const [state, setState] = useState<RequestState>({
    phase: 'input',
    categoryName: '',
    sampleWords: [],
    error: '',
    generatedCount: 0,
    aiService: null,
    detectingService: false
  });

  // Detect AI service when modal opens
  useEffect(() => {
    if (isOpen && !state.aiService && !state.detectingService) {
      setState(prev => ({ ...prev, detectingService: true }));
      detectActiveAIService().then(service => {
        setState(prev => ({ 
          ...prev, 
          aiService: service, 
          detectingService: false 
        }));
      }).catch(() => {
        setState(prev => ({ 
          ...prev, 
          aiService: 'none', 
          detectingService: false 
        }));
      });
    }
  }, [isOpen, state.aiService, state.detectingService]);

  const handleInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.categoryName.trim()) return;

    setState(prev => ({ ...prev, phase: 'confirming', error: '' }));
    
    try {
      const sampleWords = await onRequestCategory(state.categoryName.trim());
      setState(prev => ({ 
        ...prev, 
        phase: 'confirming', 
        sampleWords,
        error: '' 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        phase: 'error', 
        error: error instanceof Error ? error.message : 'Failed to get sample words'
      }));
    }
  };

  const handleConfirmGeneration = async () => {
    setState(prev => ({ ...prev, phase: 'generating' }));
    
    try {
      await onConfirmGeneration(state.categoryName, state.sampleWords);
      setState(prev => ({ 
        ...prev, 
        phase: 'success',
        generatedCount: 50 // Default expected count
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        phase: 'error', 
        error: error instanceof Error ? error.message : 'Failed to generate phrases'
      }));
    }
  };

  const handleClose = () => {
    setState({
      phase: 'input',
      categoryName: '',
      sampleWords: [],
      error: '',
      generatedCount: 0,
      aiService: null,
      detectingService: false
    });
    onClose();
  };

  const handleStartOver = () => {
    setState(prev => ({ 
      ...prev, 
      phase: 'input', 
      categoryName: '', 
      sampleWords: [], 
      error: '' 
    }));
  };

  if (!isOpen) return null;

  // AI Service indicator component
  const AIServiceIndicator = () => {
    if (state.detectingService) {
      return (
        <div className="ai-service-indicator detecting">
          <span className="service-emoji">🔍</span>
          <span className="service-text">Detecting AI service...</span>
        </div>
      );
    }

    if (!state.aiService || state.aiService === 'none') {
      return (
        <div className="ai-service-indicator error">
          <span className="service-emoji">❌</span>
          <span className="service-text">No AI service available</span>
        </div>
      );
    }

    return (
      <div className={`ai-service-indicator ${state.aiService}`}>
        <span className="service-emoji">{getAIServiceEmoji(state.aiService)}</span>
        <span className="service-text">Powered by {getAIServiceDisplayName(state.aiService)}</span>
      </div>
    );
  };

  return (
    <div className="category-request-overlay" onClick={handleClose}>
      <div className="category-request-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎯 Request Custom Category</h2>
          <button 
            className="close-button" 
            onClick={handleClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <AIServiceIndicator />

        <div className="modal-content">
          {state.phase === 'input' && (
            <form onSubmit={handleInputSubmit} className="category-input-form">
              <p className="form-description">
                Describe a category for new phrases (e.g., "Kitchen Appliances", "Video Games", "Sci-Fi Movies").
              </p>
              <div className="input-group">
                <label htmlFor="category-input">Category Name:</label>
                <input
                  id="category-input"
                  type="text"
                  value={state.categoryName}
                  onChange={(e) => setState(prev => ({ ...prev, categoryName: e.target.value }))}
                  placeholder="Enter category name..."
                  maxLength={50}
                  required
                  autoFocus
                  disabled={state.aiService === 'none'}
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={handleClose} className="cancel-button">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="preview-button" 
                  disabled={!state.categoryName.trim() || state.aiService === 'none' || state.detectingService}
                >
                  🔍 Get Sample Words
                </button>
              </div>
            </form>
          )}

          {state.phase === 'confirming' && (
            <div className="confirmation-phase">
              <p className="confirmation-description">
                Here are sample words for "<strong>{state.categoryName}</strong>":
              </p>
              <div className="sample-words">
                {state.sampleWords.map((word, index) => (
                  <span key={index} className="sample-word">
                    {word}
                  </span>
                ))}
              </div>
              <p className="generation-info">
                We'll generate about 50 phrases in this category. Continue?
              </p>
              <div className="form-actions">
                <button onClick={handleStartOver} className="back-button">
                  ← Try Different Category
                </button>
                <button onClick={handleConfirmGeneration} className="generate-button">
                  ✨ Generate Full Category
                </button>
              </div>
            </div>
          )}

          {state.phase === 'generating' && (
            <div className="generating-phase">
              <div className="loading-spinner"></div>
              <p>Generating phrases for "{state.categoryName}"...</p>
              <p className="loading-note">
                This may take a few moments while {state.aiService ? getAIServiceDisplayName(state.aiService) : 'AI'} creates your custom phrases.
              </p>
            </div>
          )}

          {state.phase === 'success' && (
            <div className="success-phase">
              <div className="success-icon">🎉</div>
              <h3>Category Generated!</h3>
              <p>
                Successfully generated <strong>{state.generatedCount}</strong> phrases 
                for "<strong>{state.categoryName}</strong>" using {state.aiService ? getAIServiceDisplayName(state.aiService) : 'AI'}.
              </p>
              <p className="success-note">
                These phrases are now available in your game! Look for the golden category 
                with the ✨ sparkle in your category selection.
              </p>
              <button onClick={handleClose} className="done-button">
                🎯 Start Playing!
              </button>
            </div>
          )}

          {state.phase === 'error' && (
            <div className="error-phase">
              <div className="error-icon">⚠️</div>
              <h3>Request Failed</h3>
              <p className="error-message">{state.error}</p>
              <div className="form-actions">
                <button onClick={handleStartOver} className="retry-button">
                  🔄 Try Again
                </button>
                <button onClick={handleClose} className="cancel-button">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 
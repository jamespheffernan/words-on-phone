import React, { useState, useEffect } from 'react';
import './CategoryRequestModal.css';
import { detectActiveAIService, getAIServiceDisplayName, getAIServiceEmoji, type AIService } from '../config/environment';
import { type PhraseScore } from '../services/phraseScorer';

interface CustomCategoryPhrase {
  phraseId: string;
  text: string;
  customCategory: string;
  source: 'openai' | 'gemini';
  fetchedAt: number;
  difficulty?: "easy" | "medium" | "hard";
  qualityScore?: number;
  qualityBreakdown?: PhraseScore['breakdown'];
}

interface CategoryRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestCategory: (categoryName: string) => Promise<string[]>;
  onConfirmGeneration: (info: { name: string; description: string; tags: string[] }, sampleWords: string[]) => Promise<CustomCategoryPhrase[]>;
}

interface RequestState {
  phase: 'input' | 'confirming' | 'generating' | 'reviewing' | 'success' | 'error';
  categoryName: string;
  sampleWords: string[];
  error: string;
  generatedCount: number;
  aiService: AIService | null;
  detectingService: boolean;
  batchProgress?: {
    current: number;
    total: number;
    status: string;
  };
  description: string;
  tags: string[];
  tagInput: string;
  generatedPhrases: CustomCategoryPhrase[];
  reviewedPhrases: CustomCategoryPhrase[];
  rejectedPhrases: string[];
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
    detectingService: false,
    description: '',
    tags: [],
    tagInput: '',
    generatedPhrases: [],
    reviewedPhrases: [],
    rejectedPhrases: []
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
      const generatedPhrases = await onConfirmGeneration({ name: state.categoryName, description: state.description, tags: state.tags }, state.sampleWords);
      setState(prev => ({ 
        ...prev, 
        phase: 'reviewing',
        generatedPhrases,
        reviewedPhrases: generatedPhrases, // Default to all approved for now
        generatedCount: generatedPhrases.length
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        phase: 'error', 
        error: error instanceof Error ? error.message : 'Failed to generate phrases'
      }));
    }
  };

  const handleApprovePhrase = (phrase: CustomCategoryPhrase) => {
    setState(prev => ({
      ...prev,
      reviewedPhrases: [...prev.reviewedPhrases.filter(p => p.phraseId !== phrase.phraseId), phrase],
      rejectedPhrases: prev.rejectedPhrases.filter(text => text !== phrase.text)
    }));
  };

  const handleRejectPhrase = (phrase: CustomCategoryPhrase) => {
    setState(prev => ({
      ...prev,
      reviewedPhrases: prev.reviewedPhrases.filter(p => p.phraseId !== phrase.phraseId),
      rejectedPhrases: [...prev.rejectedPhrases.filter(text => text !== phrase.text), phrase.text]
    }));
  };

  const handleFinishReview = () => {
    setState(prev => ({
      ...prev,
      phase: 'success',
      generatedCount: prev.reviewedPhrases.length
    }));
  };

  const handleClose = () => {
    setState({
      phase: 'input',
      categoryName: '',
      sampleWords: [],
      error: '',
      generatedCount: 0,
      aiService: null,
      detectingService: false,
      description: '',
      tags: [],
      tagInput: '',
      generatedPhrases: [],
      reviewedPhrases: [],
      rejectedPhrases: []
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

  const addTag = () => {
    if (state.tagInput.trim() && !state.tags.includes(state.tagInput.trim())) {
      setState(prev => ({ ...prev, tags: [...prev.tags, state.tagInput.trim()] }));
    }
    setState(prev => ({ ...prev, tagInput: '' }));
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
              <label>
                Description
                <textarea value={state.description} onChange={(e)=> setState(prev => ({ ...prev, description: e.target.value }))} />
              </label>
              <label>
                Tags
                <div className="tag-input">
                  <input value={state.tagInput} onChange={(e)=> setState(prev => ({ ...prev, tagInput: e.target.value }))} onKeyDown={(e)=> {if(e.key==='Enter'){e.preventDefault();addTag();}}} />
                  <button type="button" onClick={addTag}>Add</button>
                </div>
                <div className="tag-list">{state.tags.map(t=> <span key={t} className="tag">{t}</span>)}</div>
              </label>
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
              {state.batchProgress ? (
                <>
                  <p>Generating phrases for "{state.categoryName}"...</p>
                  <div className="batch-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${(state.batchProgress.current / state.batchProgress.total) * 100}%` }}
                      ></div>
                    </div>
                    <p className="progress-text">
                      {state.batchProgress.status} ({state.batchProgress.current}/{state.batchProgress.total})
                    </p>
                  </div>
                </>
              ) : (
                <p>Generating phrases for "{state.categoryName}"...</p>
              )}
              <p className="loading-note">
                This may take a few moments while {state.aiService ? getAIServiceDisplayName(state.aiService) : 'AI'} creates your custom phrases.
              </p>
            </div>
          )}

          {state.phase === 'reviewing' && (
            <div className="reviewing-phase">
              <div className="review-header">
                <h3>📝 Review Generated Phrases</h3>
                <p className="review-description">
                  Review the {state.generatedPhrases.length} generated phrases for "{state.categoryName}". 
                  Each phrase has been scored for party game suitability.
                </p>
                <div className="review-stats">
                  <span className="stat approved">✅ Approved: {state.reviewedPhrases.length}</span>
                  <span className="stat rejected">❌ Rejected: {state.rejectedPhrases.length}</span>
                </div>
              </div>
              
              <div className="phrases-list">
                {state.generatedPhrases.map((phrase) => {
                  const isApproved = state.reviewedPhrases.some(p => p.phraseId === phrase.phraseId);
                  const isRejected = state.rejectedPhrases.includes(phrase.text);
                  const qualityScore = phrase.qualityScore || 0;
                  
                  return (
                    <div key={phrase.phraseId} className={`phrase-review-item ${isApproved ? 'approved' : ''} ${isRejected ? 'rejected' : ''}`}>
                      <div className="phrase-content">
                        <div className="phrase-text">{phrase.text}</div>
                        <div className="phrase-metadata">
                          <span className={`quality-score score-${qualityScore >= 60 ? 'high' : qualityScore >= 40 ? 'medium' : 'low'}`}>
                            Score: {qualityScore}/100
                          </span>
                          <span className="difficulty-badge">
                            {phrase.difficulty || 'medium'}
                          </span>
                        </div>
                        {phrase.qualityBreakdown && (
                          <div className="quality-breakdown">
                            <small>
                              Local: {phrase.qualityBreakdown.localHeuristics}/40
                              {phrase.qualityBreakdown.wikidata && `, Wiki: ${phrase.qualityBreakdown.wikidata}/30`}
                              {phrase.qualityBreakdown.reddit && `, Reddit: ${phrase.qualityBreakdown.reddit}/15`}
                              , Category: {phrase.qualityBreakdown.categoryBoost}/15
                            </small>
                          </div>
                        )}
                      </div>
                      
                      <div className="phrase-actions">
                        {!isApproved && !isRejected && (
                          <>
                            <button 
                              onClick={() => handleApprovePhrase(phrase)} 
                              className="approve-button"
                              title="Keep this phrase"
                            >
                              ✅ Keep
                            </button>
                            <button 
                              onClick={() => handleRejectPhrase(phrase)} 
                              className="reject-button"
                              title="Remove this phrase"
                            >
                              ❌ Remove
                            </button>
                          </>
                        )}
                        {isApproved && (
                          <button 
                            onClick={() => handleRejectPhrase(phrase)} 
                            className="undo-approve-button"
                            title="Remove this phrase"
                          >
                            ↩️ Remove
                          </button>
                        )}
                        {isRejected && (
                          <button 
                            onClick={() => handleApprovePhrase(phrase)} 
                            className="undo-reject-button"
                            title="Keep this phrase"
                          >
                            ↩️ Keep
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="review-summary">
                <p>
                  {state.reviewedPhrases.length > 0 ? (
                    <>✨ {state.reviewedPhrases.length} phrases ready to add to your game!</>
                  ) : (
                    <>⚠️ No phrases selected yet. Review phrases above to continue.</>
                  )}
                </p>
              </div>
              
              <div className="form-actions">
                <button onClick={handleStartOver} className="back-button">
                  ← Try Different Category
                </button>
                <button 
                  onClick={handleFinishReview} 
                  className="finish-review-button"
                  disabled={state.reviewedPhrases.length === 0}
                >
                  🎯 Add {state.reviewedPhrases.length} Phrases to Game
                </button>
              </div>
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
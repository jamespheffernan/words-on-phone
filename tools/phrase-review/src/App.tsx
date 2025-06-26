import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePhrases } from './hooks/usePhrases';
import './App.css';

const SIDEBAR_WIDTH = 320;
const STORAGE_KEY = 'phraseReview';

type DecisionStatus = 'pending' | 'accepted' | 'rejected';

interface PhraseDecision {
  status: DecisionStatus;
  reason?: string;
}

interface ReviewResult {
  phrase: string;
  status: DecisionStatus;
  reason?: string;
}

function App() {
  const { phrases, loading, error } = usePhrases();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [decisions, setDecisions] = useState<Record<number, PhraseDecision>>({});
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [saveToast, setSaveToast] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const selectedItemRef = useRef<HTMLLIElement>(null);
  const rejectInputRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load decisions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDecisions(parsed);
      } catch (e) {
        console.warn('Failed to parse saved decisions:', e);
      }
    }
  }, []);

  // Save decisions to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(decisions).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
    }
  }, [decisions]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedIdx]);

  // Focus reject input when entering reject mode
  useEffect(() => {
    if (rejectMode && rejectInputRef.current) {
      rejectInputRef.current.focus();
    }
  }, [rejectMode]);

  // Focus search input when entering search mode
  useEffect(() => {
    if (searchMode && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchMode]);

  const downloadResults = useCallback(() => {
    const results: ReviewResult[] = [];
    
    phrases.forEach((phrase, index) => {
      const decision = decisions[index];
      if (decision) {
        results.push({
          phrase: phrase.phrase,
          status: decision.status,
          reason: decision.reason
        });
      }
    });

    const blob = new Blob([JSON.stringify(results, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phrase-review-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Show save toast
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  }, [phrases, decisions]);

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return;
    
    const query = searchQuery.toLowerCase();
    const matchIndex = phrases.findIndex(p => 
      p.phrase.toLowerCase().includes(query)
    );
    
    if (matchIndex !== -1) {
      setSelectedIdx(matchIndex);
    }
    
    setSearchMode(false);
    setSearchQuery('');
  }, [phrases, searchQuery]);

  const cycleUnreviewed = useCallback(() => {
    const unreviewed = phrases
      .map((_, index) => index)
      .filter(index => !decisions[index]);
    
    if (unreviewed.length === 0) return;
    
    const currentInUnreviewed = unreviewed.indexOf(selectedIdx);
    const nextIndex = currentInUnreviewed === -1 ? 0 : (currentInUnreviewed + 1) % unreviewed.length;
    setSelectedIdx(unreviewed[nextIndex]);
  }, [phrases, decisions, selectedIdx]);

  const handleApprove = useCallback(() => {
    setDecisions(prev => ({
      ...prev,
      [selectedIdx]: { status: 'accepted' }
    }));
    // Auto-advance to next phrase
    setSelectedIdx(prev => Math.min(phrases.length - 1, prev + 1));
  }, [selectedIdx, phrases.length]);

  const handleReject = useCallback((reason: string) => {
    setDecisions(prev => ({
      ...prev,
      [selectedIdx]: { status: 'rejected', reason }
    }));
    setRejectMode(false);
    setRejectReason('');
    // Auto-advance to next phrase
    setSelectedIdx(prev => Math.min(phrases.length - 1, prev + 1));
  }, [selectedIdx, phrases.length]);

  const handleRejectSubmit = useCallback(() => {
    if (rejectReason.trim()) {
      handleReject(rejectReason.trim());
    }
  }, [rejectReason, handleReject]);

  // Global keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle save shortcut
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        downloadResults();
        return;
      }

      // If in search mode, handle differently
      if (searchMode) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSearch();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setSearchMode(false);
          setSearchQuery('');
        }
        return;
      }

      // If in reject mode, handle differently
      if (rejectMode) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleRejectSubmit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setRejectMode(false);
          setRejectReason('');
        }
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          setSelectedIdx(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          setSelectedIdx(prev => Math.min(phrases.length - 1, prev + 1));
          break;
        case 'PageUp':
          e.preventDefault();
          setSelectedIdx(prev => Math.max(0, prev - 10));
          break;
        case 'PageDown':
          e.preventDefault();
          setSelectedIdx(prev => Math.min(phrases.length - 1, prev + 10));
          break;
        case 'g':
          if (e.shiftKey) {
            // Shift+G → last
            e.preventDefault();
            setSelectedIdx(phrases.length - 1);
          } else {
            // g → first
            e.preventDefault();
            setSelectedIdx(0);
          }
          break;
        case 'a':
          e.preventDefault();
          handleApprove();
          break;
        case 'r':
          e.preventDefault();
          setRejectMode(true);
          setRejectReason('');
          break;
        case '/':
          e.preventDefault();
          setSearchMode(true);
          setSearchQuery('');
          break;
        case 'u':
          e.preventDefault();
          cycleUnreviewed();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phrases.length, rejectMode, searchMode, handleApprove, handleRejectSubmit, downloadResults, handleSearch, cycleUnreviewed]);

  if (loading) return <div>Loading phrases…</div>;
  if (error) return <div>Error: {error}</div>;

  const current = phrases[selectedIdx];
  const currentDecision = decisions[selectedIdx];

  const getStatusBadge = (status: DecisionStatus) => {
    switch (status) {
      case 'accepted': return '✅';
      case 'rejected': return '❌';
      default: return '';
    }
  };

  const reviewedCount = Object.keys(decisions).length;
  const acceptedCount = Object.values(decisions).filter(d => d.status === 'accepted').length;
  const rejectedCount = Object.values(decisions).filter(d => d.status === 'rejected').length;
  const unreviewedCount = phrases.length - reviewedCount;

  return (
    <div className="app-container">
      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {current && `Current phrase: ${current.phrase}. ${currentDecision ? `Status: ${currentDecision.status}` : 'Not yet reviewed'}`}
      </div>

      {/* Sidebar */}
      <nav className="sidebar" role="navigation" aria-label="Phrase list">
        <header className="sidebar-header">
          <h1>Phrases ({phrases.length})</h1>
          <div className="progress-stats">
            Reviewed: {reviewedCount} • ✅ {acceptedCount} • ❌ {rejectedCount}
          </div>
          {unreviewedCount > 0 && (
            <div className="progress-stats pending">
              {unreviewedCount} pending
            </div>
          )}
        </header>
        <ul className="phrase-list" role="listbox" aria-label="Phrase list">
          {phrases.map((p, i) => {
            const decision = decisions[i];
            return (
              <li
                key={i}
                ref={i === selectedIdx ? selectedItemRef : null}
                className={`phrase-list-item ${i === selectedIdx ? 'selected' : ''}`}
                role="option"
                aria-selected={i === selectedIdx}
                aria-label={`${p.phrase}${decision ? `, ${decision.status}` : ', not reviewed'}`}
                tabIndex={i === selectedIdx ? 0 : -1}
                onClick={() => setSelectedIdx(i)}
              >
                <span className="phrase-text">{p.phrase}</span>
                {decision && (
                  <span className="status-badge" aria-label={`Status: ${decision.status}`}>
                    {getStatusBadge(decision.status)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Center panel */}
      <main className="center-panel" role="main">
        <h2 className="current-phrase" id="current-phrase">
          {current?.phrase}
        </h2>

        {/* Quality Score Display */}
        {current?.qualityScore !== undefined && (
          <div className="quality-info">
            <div className="quality-score">
              <span className="score-value">{current.qualityScore}</span>
              <span className="score-label">/ 100</span>
              {current.verdict && (
                <span className={`verdict verdict-${current.verdict.toLowerCase().replace(/\s/g, '-')}`}>
                  {current.verdict}
                </span>
              )}
            </div>
            
            {current.qualityBreakdown && (
              <div className="score-breakdown">
                <h4>Score Breakdown</h4>
                <div className="breakdown-grid">
                  <div className="breakdown-item">
                    <span className="breakdown-label">Local Heuristics:</span>
                    <span className="breakdown-value">{current.qualityBreakdown.localHeuristics}</span>
                  </div>
                  {current.qualityBreakdown.wikidata !== undefined && (
                    <div className="breakdown-item">
                      <span className="breakdown-label">Wikipedia:</span>
                      <span className="breakdown-value">{current.qualityBreakdown.wikidata}</span>
                    </div>
                  )}
                  {current.qualityBreakdown.reddit !== undefined && (
                    <div className="breakdown-item">
                      <span className="breakdown-label">Reddit:</span>
                      <span className="breakdown-value">{current.qualityBreakdown.reddit}</span>
                    </div>
                  )}
                  <div className="breakdown-item">
                    <span className="breakdown-label">Category Boost:</span>
                    <span className="breakdown-value">{current.qualityBreakdown.categoryBoost}</span>
                  </div>
                </div>
                {current.qualityBreakdown.error && (
                  <div className="breakdown-error">
                    ⚠️ Scoring Error: {current.qualityBreakdown.error}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Source and Category Info */}
        {(current?.category || current?.source || current?.fetchedAt) && (
          <div className="phrase-meta">
            {current.category && (
              <span className="meta-item">📁 {current.category}</span>
            )}
            {current.source && (
              <span className="meta-item">🤖 {current.source}</span>
            )}
            {current.fetchedAt && (
              <span className="meta-item">
                📅 {new Date(current.fetchedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        )}
        
        {currentDecision && (
          <div className={`decision-status ${currentDecision.status === 'accepted' ? 'status-accepted' : 'status-rejected'}`}>
            {currentDecision.status === 'accepted' ? '✅ Accepted' : `❌ Rejected: ${currentDecision.reason}`}
          </div>
        )}

        {searchMode && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="search-title">
            <div className="modal-content">
              <h3 id="search-title">Search phrases</h3>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search..."
                className="search-input"
                aria-label="Search phrases"
              />
              <div className="modal-help">
                Press Enter to jump to first match • Esc to cancel
              </div>
            </div>
          </div>
        )}

        {rejectMode && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="reject-title">
            <div className="modal-content">
              <h3 id="reject-title">Why reject this phrase?</h3>
              <textarea
                ref={rejectInputRef}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="reject-textarea"
                aria-label="Rejection reason"
              />
              <div className="modal-help">
                Press Enter to submit • Esc to cancel
              </div>
            </div>
          </div>
        )}

        {!rejectMode && !searchMode && (
          <div className="keyboard-hints" role="region" aria-label="Keyboard shortcuts">
            <div><strong>a</strong> = approve • <strong>r</strong> = reject • <strong>⌘/Ctrl+S</strong> = save</div>
            <div><strong>/</strong> = search • <strong>u</strong> = next unreviewed • ↑↓ or j/k = navigate</div>
          </div>
        )}
      </main>

      {/* Save toast */}
      {saveToast && (
        <div className="toast" role="status" aria-live="polite">
          ✅ Review results saved!
        </div>
      )}
    </div>
  );
}

export default App;

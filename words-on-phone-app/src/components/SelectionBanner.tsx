import React, { useMemo } from 'react';
import { phraseService } from '../services/phraseService';
import './SelectionBanner.css';

interface Props {
  categories: string[];
  onClear: () => void;
}

export const SelectionBanner: React.FC<Props> = ({ categories, onClear }) => {
  const phraseCount = useMemo(() => {
    const set = new Set<string>();
    categories.forEach((cat) => {
      phraseService.getPhrasesByCategory(cat as any).forEach((p) => set.add(p));
    });
    return set.size;
  }, [categories]);

  if (categories.length === 0) return null;

  return (
    <div className="selection-banner" role="status" aria-live="polite">
      <span>
        Selected: {categories.join(', ')} – {phraseCount} phrases
      </span>
      <button onClick={onClear} className="clear-btn" aria-label="Clear selected categories">
        ✖
      </button>
    </div>
  );
}; 
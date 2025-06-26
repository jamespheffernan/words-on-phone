import { useState, useEffect } from 'react';

export interface PhraseBreakdown {
  localHeuristics: number;
  wikidata?: number;
  reddit?: number;
  categoryBoost: number;
  error?: string;
}

export interface Phrase {
  phrase: string;
  category?: string;
  qualityScore?: number;
  qualityBreakdown?: PhraseBreakdown;
  verdict?: string;
  source?: 'gemini' | 'openai' | 'manual';
  fetchedAt?: number;
}

export function usePhrases(): { phrases: Phrase[]; loading: boolean; error: string | null } {
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('phrases.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load phrases.json');
        return res.json();
      })
      .then((data) => {
        // Support both legacy format (array of strings) and new format (objects with scoring)
        if (Array.isArray(data.phrases)) {
          setPhrases(data.phrases.map((p: string | Phrase) => {
            if (typeof p === 'string') {
              return { phrase: p, category: data.category };
            } else {
              return { category: data.category, ...p };
            }
          }));
        } else if (Array.isArray(data)) {
          // Direct array format
          setPhrases(data.map((p: string | Phrase) => {
            if (typeof p === 'string') {
              return { phrase: p };
            } else {
              return p;
            }
          }));
        } else {
          setError('Invalid phrases.json format');
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { phrases, loading, error };
} 
import { useState, useEffect } from 'react';

export interface Phrase {
  phrase: string;
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
        if (Array.isArray(data.phrases)) {
          setPhrases(data.phrases.map((p: string) => ({ phrase: p })));
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
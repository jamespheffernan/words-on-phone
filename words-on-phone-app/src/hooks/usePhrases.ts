import { useState, useEffect } from 'react';

export interface Phrase {
  phrase: string;
}

export function usePhrases(): { phrases: Phrase[]; loading: boolean; error: string | null } {
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Replace with actual fetch from phrases.json
    setPhrases([
      { phrase: 'Planking Challenge' },
      { phrase: 'Roller Coaster Ride' },
    ]);
    setLoading(false);
  }, []);

  return { phrases, loading, error };
} 
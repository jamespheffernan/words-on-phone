import { useEffect, useRef, useState } from 'react';

export interface WorkerStatus {
  lastFetch: number;
  dailyUsage: number;
  dailyQuotaLimit: number;
  fetchedPhrasesCount: number;
  nextFetchIn: number;
  apiKeyAvailable: boolean;
}

export const usePhraseWorker = () => {
  const workerRef = useRef<Worker | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<WorkerStatus | null>(null);
  const [lastFetch, setLastFetch] = useState<{ count: number; timestamp: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Create worker
    workerRef.current = new Worker(
      new URL('../workers/phraseWorker.ts', import.meta.url),
      { type: 'module' }
    );

    // Set up message handling
    workerRef.current.onmessage = (event) => {
      try {
        if (event.data && typeof event.data === 'object') {
          const { type, count, error: workerError, status: workerStatus } = event.data;
          
          switch (type) {
            case 'FETCH_COMPLETE':
              if (count !== undefined) {
                setLastFetch({
                  count,
                  timestamp: Date.now()
                });
              }
              setError(workerError || null);
              break;
              
            case 'STATUS_UPDATE':
              setStatus(workerStatus || null);
              break;
              
            case 'ERROR':
              setError(workerError || 'Unknown worker error');
              break;
              
            default:
              console.warn('Unknown worker message type:', type);
          }
        }
      } catch (err) {
        console.error('Error processing worker message:', err);
        setError('Failed to process worker response');
      }
    };

    workerRef.current.onerror = (error) => {
      console.error('Phrase worker error:', error);
      setError('Worker initialization failed');
      setIsRunning(false);
    };

    // Start worker
    startWorker();

    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // Functions to control the worker
  const startWorker = () => {
    if (workerRef.current && !isRunning) {
      workerRef.current.postMessage({ type: 'START' });
    }
  };

  const stopWorker = () => {
    if (workerRef.current && isRunning) {
      workerRef.current.postMessage({ type: 'STOP' });
    }
  };

  const fetchNow = () => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'FETCH_NOW' });
    }
  };

  const requestStatus = () => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'STATUS' });
    }
  };

  const getStoredPhrases = () => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'GET_PHRASES' });
    }
  };

  return {
    isRunning,
    status,
    lastFetch,
    error,
    startWorker,
    stopWorker,
    fetchNow,
    requestStatus,
    getStoredPhrases,
  };
}; 
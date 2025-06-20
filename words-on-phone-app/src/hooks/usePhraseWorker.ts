import { useEffect, useRef, useState } from 'react';
import { PhraseCategory } from '../data/phrases';
import { FetchedPhrase } from '../types/openai';

export interface WorkerStatus {
  lastFetch: number;
  dailyUsage: number;
  dailyQuotaLimit: number;
  fetchedPhrasesCount: number;
  nextFetchIn: number;
  apiKeyAvailable: boolean;
}

export interface WorkerMessage {
  type: 'FETCH_SUCCESS' | 'FETCH_ERROR' | 'FETCH_STARTED' | 'FETCH_SKIPPED' | 'FETCH_CANCELLED' | 'STATUS' | 'STATUS_ERROR' | 'WORKER_STARTED' | 'WORKER_STOPPED' | 'ERROR' | 'STORED_PHRASES';
  count?: number;
  error?: string;
  reason?: string;
  phrases?: FetchedPhrase[];
  status?: WorkerStatus;
}

export function usePhraseWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<WorkerStatus | null>(null);
  const [lastFetch, setLastFetch] = useState<{ count: number; timestamp: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize worker on mount
  useEffect(() => {
    const initWorker = async () => {
      try {
        workerRef.current = new Worker(
          new URL('../workers/phraseWorker.ts', import.meta.url),
          { type: 'module' }
        );

        workerRef.current.onmessage = (event: MessageEvent<WorkerMessage>) => {
          const { type, count, error: workerError, phrases, status: workerStatus } = event.data;

          switch (type) {
            case 'WORKER_STARTED':
              setIsRunning(true);
              setError(null);
              break;

            case 'WORKER_STOPPED':
              setIsRunning(false);
              break;

            case 'FETCH_STARTED':
              setError(null);
              break;

            case 'FETCH_SUCCESS':
              if (count !== undefined) {
                setLastFetch({ count, timestamp: Date.now() });
              }
              setError(null);
              break;

            case 'FETCH_ERROR':
              setError(workerError || 'Unknown fetch error');
              break;

            case 'FETCH_SKIPPED':
              // Could show info about why it was skipped
              break;

            case 'STATUS':
              if (workerStatus) {
                setStatus(workerStatus);
              }
              break;

            case 'STATUS_ERROR':
              setError(workerError || 'Failed to get worker status');
              break;

            case 'ERROR':
              setError(workerError || 'Worker error');
              break;

            default:
              console.log('Unhandled worker message:', type);
          }
        };

        workerRef.current.onerror = (error) => {
          console.error('Worker error:', error);
          setError('Worker initialization failed');
          setIsRunning(false);
        };

        // Request initial status
        workerRef.current.postMessage({ type: 'STATUS' });
      } catch (error) {
        console.error('Failed to initialize phrase worker:', error);
        setError('Failed to initialize background phrase fetcher');
      }
    };

    initWorker();

    // Cleanup on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'STOP' });
        workerRef.current.terminate();
        workerRef.current = null;
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
} 
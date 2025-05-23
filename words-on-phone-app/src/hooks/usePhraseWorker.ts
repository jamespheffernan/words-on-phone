import { useEffect, useRef, useState, useCallback } from 'react';
import { PhraseCategory } from '../data/phrases';

interface WorkerStatus {
  lastFetch: number;
  dailyUsage: number;
  dailyQuotaLimit: number;
  fetchedPhrasesCount: number;
  nextFetchIn: number;
}

interface FetchedPhrase {
  phraseId: string;
  text: string;
  category: PhraseCategory;
  source: 'gemini';
  fetchedAt: number;
}

interface WorkerMessage {
  type: string;
  [key: string]: unknown;
}

export interface PhraseWorkerState {
  isLoaded: boolean;
  isWorking: boolean;
  status: WorkerStatus | null;
  error: string | null;
  lastFetchResult: {
    count: number;
    phrases?: FetchedPhrase[];
    message?: string;
  } | null;
}

export const usePhraseWorker = () => {
  const workerRef = useRef<Worker | null>(null);
  const [state, setState] = useState<PhraseWorkerState>({
    isLoaded: false,
    isWorking: false,
    status: null,
    error: null,
    lastFetchResult: null,
  });

  const getStatusRef = useRef<(() => void) | null>(null);

  const updateState = useCallback((updates: Partial<PhraseWorkerState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleWorkerMessage = useCallback((event: MessageEvent<WorkerMessage>) => {
    const { type, ...payload } = event.data;

    switch (type) {
      case 'FETCH_STARTED':
        updateState({ isWorking: true, error: null });
        break;

      case 'FETCH_SUCCESS':
        updateState({ 
          isWorking: false, 
          lastFetchResult: {
            count: payload.count as number,
            phrases: payload.phrases as FetchedPhrase[] | undefined,
            message: payload.message as string | undefined,
          },
          error: null 
        });
        // Refresh status after successful fetch
        setTimeout(() => getStatusRef.current?.(), 1000);
        break;

      case 'FETCH_ERROR':
        updateState({ 
          isWorking: false, 
          error: (payload.error as string) || 'Unknown fetch error' 
        });
        break;

      case 'FETCH_SKIPPED':
        updateState({ 
          isWorking: false,
          lastFetchResult: {
            count: 0,
            message: `Fetch skipped: ${payload.reason as string}`,
          }
        });
        break;

      case 'FETCH_CANCELLED':
        updateState({ isWorking: false });
        break;

      case 'STATUS':
        updateState({ status: payload.status as WorkerStatus, error: null });
        break;

      case 'STATUS_ERROR':
        updateState({ error: (payload.error as string) || 'Failed to get status' });
        break;

      case 'WORKER_STOPPED':
        updateState({ isLoaded: false, isWorking: false });
        break;

      default:
        console.warn('Unknown worker message type:', type);
    }
  }, [updateState]);

  const initializeWorker = useCallback(() => {
    try {
      // Create worker from URL
      const workerUrl = new URL('../workers/phraseWorker.ts', import.meta.url);
      workerRef.current = new Worker(workerUrl, { type: 'module' });

      workerRef.current.addEventListener('message', handleWorkerMessage);
      
      workerRef.current.addEventListener('error', (error) => {
        console.error('Worker error:', error);
        updateState({ 
          error: `Worker error: ${error.message || 'Unknown error'}`,
          isLoaded: false 
        });
      });

      updateState({ isLoaded: true, error: null });

      // Get initial status
      setTimeout(() => getStatusRef.current?.(), 500);

    } catch (error) {
      console.error('Failed to initialize worker:', error);
      updateState({ 
        error: `Failed to initialize worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isLoaded: false 
      });
    }
  }, [handleWorkerMessage, updateState]);

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'STOP_WORKER' });
      workerRef.current.terminate();
      workerRef.current = null;
      updateState({ isLoaded: false, isWorking: false });
    }
  }, [updateState]);

  const manualFetch = useCallback(() => {
    if (workerRef.current && state.isLoaded && !state.isWorking) {
      workerRef.current.postMessage({ type: 'FETCH_NOW' });
      updateState({ error: null });
    }
  }, [state.isLoaded, state.isWorking, updateState]);

  const getStatus = useCallback(() => {
    if (workerRef.current && state.isLoaded) {
      workerRef.current.postMessage({ type: 'STATUS' });
    }
  }, [state.isLoaded]);

  // Update the ref when getStatus changes
  getStatusRef.current = getStatus;

  // Initialize worker on mount
  useEffect(() => {
    initializeWorker();

    // Cleanup on unmount
    return () => {
      terminateWorker();
    };
  }, [initializeWorker, terminateWorker]);

  // Periodically refresh status
  useEffect(() => {
    if (!state.isLoaded) return;

    const statusInterval = setInterval(() => {
      getStatus();
    }, 30000); // Every 30 seconds

    return () => clearInterval(statusInterval);
  }, [state.isLoaded, getStatus]);

  return {
    ...state,
    manualFetch,
    getStatus,
    terminateWorker,
    initializeWorker,
  };
}; 
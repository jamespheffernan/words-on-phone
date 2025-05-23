/// <reference lib="webworker" />

import { PhraseCategory } from '../data/phrases';

// Gemini API Response Interface
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface FetchedPhrase {
  phraseId: string;
  text: string;
  category: PhraseCategory;
  source: 'gemini';
  fetchedAt: number;
}

// Environment configuration - now uses serverless function
const GEMINI_API_URL = '/netlify/functions/gemini'; // Serverless function endpoint

const FETCH_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
const DAILY_QUOTA_LIMIT = 1000;
const PHRASES_PER_REQUEST = 20;

// Storage keys for IndexedDB
const LAST_FETCH_KEY = 'lastPhraseFetch';
const DAILY_USAGE_KEY = 'dailyGeminiUsage';
const FETCHED_PHRASES_KEY = 'fetchedPhrases';

// Worker state
let isRunning = false;
const FETCH_INTERVAL_MS = FETCH_INTERVAL;
const DAILY_QUOTA_LIMIT_REQ = DAILY_QUOTA_LIMIT;

class PhraseWorker {
  private abortController: AbortController | null = null;

  constructor() {
    this.setupEventListeners();
    this.scheduleNextFetch();
  }

  private setupEventListeners() {
    self.addEventListener('message', (event) => {
      const { type } = event.data;

      switch (type) {
        case 'START':
          this.startPeriodicFetching();
          break;
        case 'FETCH_NOW':
          this.fetchPhrases(true);
          break;
        case 'STOP':
          this.cleanup();
          break;
        case 'STATUS':
          this.sendStatus();
          break;
        case 'GET_PHRASES':
          this.sendStoredPhrases();
          break;
        default:
          console.warn('Unknown message type:', type);
      }
    });

    // Handle unhandled promise rejections
    self.addEventListener('unhandledrejection', (event) => {
      this.postMessage({
        type: 'ERROR',
        error: `Unhandled promise rejection: ${event.reason}`
      });
    });

    // Handle errors
    self.addEventListener('error', (event) => {
      this.postMessage({
        type: 'ERROR',
        error: `Worker error: ${event.message}`
      });
    });
  }

  private async fetchPhrases(manual = false) {
    try {
      // Check if we should fetch
      if (!manual && !(await this.shouldFetch())) {
        this.postMessage({ type: 'FETCH_SKIPPED', reason: 'throttled' });
        return;
      }

      // Check daily quota
      if (await this.isDailyQuotaExceeded()) {
        this.postMessage({ type: 'FETCH_SKIPPED', reason: 'quota_exceeded' });
        return;
      }

      this.postMessage({ type: 'FETCH_STARTED' });

      // Create abort controller for this request
      this.abortController = new AbortController();

      const newPhrases = await this.requestPhrasesFromGemini();
      const deduplicatedPhrases = await this.deduplicatePhrases(newPhrases);
      
      if (deduplicatedPhrases.length > 0) {
        await this.storePhrases(deduplicatedPhrases);
        await this.updateFetchMetadata();
        
        this.postMessage({ 
          type: 'FETCH_SUCCESS', 
          count: deduplicatedPhrases.length,
          phrases: deduplicatedPhrases 
        });
      } else {
        this.postMessage({ 
          type: 'FETCH_SUCCESS', 
          count: 0,
          message: 'No new phrases after deduplication'
        });
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.postMessage({ type: 'FETCH_CANCELLED' });
      } else {
        this.postMessage({ 
          type: 'FETCH_ERROR', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    } finally {
      this.abortController = null;
    }
  }

  private async shouldFetch(): Promise<boolean> {
    try {
      const lastFetch = await this.getFromStorage(LAST_FETCH_KEY) || 0;
      const now = Date.now();
      return (now - lastFetch) >= FETCH_INTERVAL_MS;
    } catch {
      return true; // Default to allowing fetch if we can't check
    }
  }

  private async isDailyQuotaExceeded(): Promise<boolean> {
    try {
      const today = new Date().toDateString();
      const usageData = await this.getFromStorage(DAILY_USAGE_KEY) || { date: today, count: 0 };
      
      // Reset if it's a new day
      if (usageData.date !== today) {
        await this.setInStorage(DAILY_USAGE_KEY, { date: today, count: 0 });
        return false;
      }
      
      return usageData.count >= DAILY_QUOTA_LIMIT_REQ;
    } catch {
      return false; // Default to allowing if we can't check
    }
  }

  private async requestPhrasesFromGemini(): Promise<FetchedPhrase[]> {
    const categories = Object.values(PhraseCategory);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    
    const prompt = `Generate ${PHRASES_PER_REQUEST} unique, fun, and challenging phrases for a party game similar to "Catch Phrase" in the category "${randomCategory}". 
    
    Rules:
    - Each phrase should be 1-4 words
    - Suitable for all ages
    - Not too obvious but not impossibly obscure
    - No proper names or very specific references
    - Return only the phrases, one per line, no numbering or formatting
    
    Category: ${randomCategory}`;

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        category: randomCategory,
        phraseCount: PHRASES_PER_REQUEST,
      }),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid Gemini API key');
      } else if (response.status === 429) {
        throw new Error('Gemini API rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }
    }

    const data: GeminiResponse = await response.json();
    const content = data.candidates[0]?.content?.parts[0]?.text;
    
    if (!content) {
      throw new Error('No content received from Gemini');
    }

    // Parse phrases from response
    const phrases = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.length <= 50) // Reasonable length limit
      .map(text => ({
        phraseId: this.generatePhraseId(text),
        text,
        category: randomCategory,
        source: 'gemini' as const,
        fetchedAt: Date.now(),
      }));

    // Update daily usage
    await this.incrementDailyUsage();

    return phrases;
  }

  private generatePhraseId(text: string): string {
    // Create a hash-like ID from the text
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `gemini_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
  }

  private async deduplicatePhrases(newPhrases: FetchedPhrase[]): Promise<FetchedPhrase[]> {
    try {
      const existingPhrases = await this.getFromStorage(FETCHED_PHRASES_KEY) || [];
      const existingTexts = new Set(existingPhrases.map((p: FetchedPhrase) => p.text.toLowerCase()));
      
      return newPhrases.filter(phrase => 
        !existingTexts.has(phrase.text.toLowerCase())
      );
    } catch {
      return newPhrases; // Return all if we can't check
    }
  }

  private async storePhrases(phrases: FetchedPhrase[]) {
    try {
      const existingPhrases = await this.getFromStorage(FETCHED_PHRASES_KEY) || [];
      const updatedPhrases = [...existingPhrases, ...phrases];
      
      // Keep only the most recent 1000 phrases to prevent unlimited growth
      const recentPhrases = updatedPhrases
        .sort((a, b) => b.fetchedAt - a.fetchedAt)
        .slice(0, 1000);
      
      await this.setInStorage(FETCHED_PHRASES_KEY, recentPhrases);
    } catch (error) {
      throw new Error(`Failed to store phrases: ${error}`);
    }
  }

  private async updateFetchMetadata() {
    await this.setInStorage(LAST_FETCH_KEY, Date.now());
  }

  private async incrementDailyUsage() {
    const today = new Date().toDateString();
    const usageData = await this.getFromStorage(DAILY_USAGE_KEY) || { date: today, count: 0 };
    
    if (usageData.date !== today) {
      // New day, reset counter
      await this.setInStorage(DAILY_USAGE_KEY, { date: today, count: 1 });
    } else {
      // Increment existing counter
      await this.setInStorage(DAILY_USAGE_KEY, { 
        date: today, 
        count: usageData.count + 1 
      });
    }
  }

  private async sendStatus() {
    try {
      const lastFetch = await this.getFromStorage(LAST_FETCH_KEY) || 0;
      const usageData = await this.getFromStorage(DAILY_USAGE_KEY) || { date: new Date().toDateString(), count: 0 };
      const phrasesCount = (await this.getFromStorage(FETCHED_PHRASES_KEY) || []).length;
      
      this.postMessage({
        type: 'STATUS',
        status: {
          lastFetch,
          dailyUsage: usageData.count,
          dailyQuotaLimit: DAILY_QUOTA_LIMIT_REQ,
          fetchedPhrasesCount: phrasesCount,
          nextFetchIn: Math.max(0, FETCH_INTERVAL_MS - (Date.now() - lastFetch)),
          apiKeyAvailable: true,
        }
      });
    } catch (error) {
      this.postMessage({
        type: 'STATUS_ERROR',
        error: error instanceof Error ? error.message : 'Failed to get status'
      });
    }
  }

  private async sendStoredPhrases() {
    try {
      const phrases = await this.getFromStorage(FETCHED_PHRASES_KEY) || [];
      this.postMessage({
        type: 'STORED_PHRASES',
        phrases
      });
    } catch (error) {
      this.postMessage({
        type: 'ERROR',
        error: error instanceof Error ? error.message : 'Failed to get stored phrases'
      });
    }
  }

  private scheduleNextFetch() {
    // Check every hour if it's time to fetch
    const checkInterval = 60 * 60 * 1000; // 1 hour
    
    setInterval(async () => {
      if (await this.shouldFetch()) {
        this.fetchPhrases();
      }
    }, checkInterval);
  }

  private cleanup() {
    isRunning = false;
    if (this.abortController) {
      this.abortController.abort();
    }
    this.postMessage({ type: 'WORKER_STOPPED' });
  }

  private postMessage(message: any) {
    self.postMessage(message);
  }

  // Simple IndexedDB wrapper for worker context
  private async getFromStorage(key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('words-on-phone-worker', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['storage'], 'readonly');
        const store = transaction.objectStore('storage');
        const getRequest = store.get(key);
        
        getRequest.onsuccess = () => resolve(getRequest.result?.value);
        getRequest.onerror = () => reject(getRequest.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('storage')) {
          db.createObjectStore('storage', { keyPath: 'key' });
        }
      };
    });
  }

  private async setInStorage(key: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('words-on-phone-worker', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['storage'], 'readwrite');
        const store = transaction.objectStore('storage');
        const putRequest = store.put({ key, value });
        
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('storage')) {
          db.createObjectStore('storage', { keyPath: 'key' });
        }
      };
    });
  }

  private async startPeriodicFetching() {
    if (isRunning) {
      return; // Already running
    }
    
    isRunning = true;
    this.postMessage({ type: 'WORKER_STARTED' });
    
    while (isRunning) {
      try {
        if (await this.shouldFetch()) {
          await this.fetchPhrases();
        }
        
        // Wait 1 hour before checking again
        await new Promise(resolve => setTimeout(resolve, 60 * 60 * 1000));
      } catch (error) {
        this.postMessage({
          type: 'ERROR',
          error: error instanceof Error ? error.message : 'Error in periodic fetching'
        });
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 60 * 60 * 1000));
      }
    }
  }
}

// Initialize the worker
new PhraseWorker(); 
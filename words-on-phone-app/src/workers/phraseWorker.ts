/// <reference lib="webworker" />

import { PhraseCategory } from '../data/phrases';

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface FetchedPhrase {
  phraseId: string;
  text: string;
  category: PhraseCategory;
  source: 'openai';
  fetchedAt: number;
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const FETCH_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
const DAILY_QUOTA_LIMIT = 1000;
const PHRASES_PER_REQUEST = 20;

// Storage keys for IndexedDB
const LAST_FETCH_KEY = 'lastPhraseFetch';
const DAILY_USAGE_KEY = 'dailyOpenAIUsage';
const FETCHED_PHRASES_KEY = 'fetchedPhrases';

// Worker state
let isRunning = false;
let lastFetchTime = 0;
const FETCH_INTERVAL_MS = FETCH_INTERVAL;
const DAILY_QUOTA_LIMIT_REQ = DAILY_QUOTA_LIMIT;
let dailyRequestCount = 0;
let lastResetDate = new Date().toDateString();

// Rate limiting
const THROTTLE_DELAY = 1000; // 1 second between requests
let lastRequestTime = 0;

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
        case 'MANUAL_FETCH':
          this.fetchPhrases(true);
          break;
        case 'GET_STATUS':
          this.sendStatus();
          break;
        case 'STOP_WORKER':
          this.cleanup();
          break;
        case 'START_FETCHING':
          if (!isRunning) {
            isRunning = true;
            this.startPeriodicFetching();
            this.postMessage({ type: 'WORKER_STARTED' });
          }
          break;
        case 'STOP_FETCHING':
          isRunning = false;
          this.postMessage({ type: 'WORKER_STOPPED' });
          break;
        case 'FETCH_NOW':
          if (this.canMakeRequest()) {
            this.fetchPhrases();
          } else {
            this.postMessage({ 
              type: 'ERROR', 
              error: 'Daily quota exceeded or rate limited' 
            });
          }
          break;
        default:
          console.warn('Unknown message type:', type);
      }
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

      const apiKey = await this.getApiKey();
      if (!apiKey) {
        this.postMessage({ type: 'FETCH_ERROR', error: 'No API key configured' });
        return;
      }

      // Create abort controller for this request
      this.abortController = new AbortController();

      const newPhrases = await this.requestPhrasesFromOpenAI(apiKey);
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
      
      // Reset counter if it's a new day
      if (usageData.date !== today) {
        await this.setInStorage(DAILY_USAGE_KEY, { date: today, count: 0 });
        return false;
      }
      
      return usageData.count >= DAILY_QUOTA_LIMIT_REQ;
    } catch {
      return false; // Default to allowing if we can't check
    }
  }

  private async getApiKey(): Promise<string | null> {
    // Try to get from environment or storage
    // In a real app, this would be more secure
    return await this.getFromStorage('openai_api_key') || null;
  }

  private async requestPhrasesFromOpenAI(apiKey: string): Promise<FetchedPhrase[]> {
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

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a creative assistant helping generate phrases for a party game. Return only the phrases, one per line.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.8,
      }),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data: OpenAIResponse = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content received from OpenAI');
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
        source: 'openai' as const,
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
    return `openai_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
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
        }
      });
    } catch (error) {
      this.postMessage({
        type: 'STATUS_ERROR',
        error: error instanceof Error ? error.message : 'Failed to get status'
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

  private canMakeRequest(): boolean {
    const now = Date.now();
    const currentDate = new Date().toDateString();
    
    // Reset daily counter if it's a new day
    if (currentDate !== lastResetDate) {
      dailyRequestCount = 0;
      lastResetDate = currentDate;
    }
    
    // Check daily quota
    if (dailyRequestCount >= DAILY_QUOTA_LIMIT_REQ) {
      return false;
    }
    
    // Check rate limiting
    if (now - lastRequestTime < THROTTLE_DELAY) {
      return false;
    }
    
    return true;
  }

  private async startPeriodicFetching() {
    while (isRunning) {
      const now = Date.now();
      
      // Check if it's time to fetch
      if (now - lastFetchTime >= FETCH_INTERVAL_MS && this.canMakeRequest()) {
        await this.fetchPhrases();
        lastFetchTime = now;
      }
      
      // Wait 1 minute before checking again
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
  }
}

// Initialize the worker
new PhraseWorker(); 
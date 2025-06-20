/// <reference lib="webworker" />

// Inline enum to avoid import issues in worker context
enum PhraseCategory {
  EVERYTHING = 'Everything',
  MOVIES = 'Movies & TV',
  MUSIC = 'Music & Artists',
  SPORTS = 'Sports & Athletes',
  FOOD = 'Food & Drink',
  PLACES = 'Places & Travel',
  PEOPLE = 'Famous People',
  TECHNOLOGY = 'Technology & Science',
  HISTORY = 'History & Events',
  ENTERTAINMENT = 'Entertainment & Pop Culture',
  NATURE = 'Nature & Animals'
}

// Import centralized types - inline interfaces for worker compatibility
interface CustomTerm {
  id: string; // UUID echoed from request
  topic?: string; // Optional topic echoed back
  phrase: string; // 1-4 words, Title-case
  difficulty?: 'easy' | 'medium' | 'hard'; // Optional difficulty
}

type OpenAISuccessResponse = CustomTerm[];
interface OpenAIErrorResponse {
  error: string; // Short error reason
}
type OpenAIResponse = OpenAISuccessResponse | OpenAIErrorResponse;

interface FetchedPhrase {
  phraseId: string;
  text: string;
  category: PhraseCategory;
  source: 'openai'; // Updated to reflect OpenAI source
  fetchedAt: number;
  difficulty?: 'easy' | 'medium' | 'hard'; // Added difficulty field
}

// Environment configuration - now uses OpenAI serverless function
const OPENAI_API_URL = self.location?.hostname === 'localhost' && self.location?.port === '5173'
  ? 'http://localhost:8888/.netlify/functions/openai'  // Development: Netlify Dev on port 8888
  : '/.netlify/functions/openai'; // Production: same domain

const FETCH_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
const DAILY_QUOTA_LIMIT = 1000;
const PHRASES_PER_REQUEST = 50; // Increased batch size for OpenAI cost optimization

// Storage keys for IndexedDB
const LAST_FETCH_KEY = 'lastPhraseFetch';
const DAILY_USAGE_KEY = 'dailyOpenAIUsage'; // Updated key name
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

  // Generate UUID for phrase IDs (same implementation as centralized function)
  private generateUUID(): string {
    // Use crypto.randomUUID() if available (modern browsers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback UUID v4 implementation for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Generate multiple UUIDs for batch requests
  private generateUUIDs(count: number): string[] {
    return Array.from({ length: count }, () => this.generateUUID());
  }

  // Type guard for OpenAI responses
  private isOpenAIErrorResponse(response: OpenAIResponse): response is OpenAIErrorResponse {
    return typeof response === 'object' && 'error' in response;
  }

  // Type guard for custom terms
  private isValidCustomTerm(term: any): term is CustomTerm {
    return (
      typeof term === 'object' &&
      typeof term.id === 'string' &&
      typeof term.phrase === 'string' &&
      term.phrase.trim().length > 0 &&
      (term.topic === undefined || typeof term.topic === 'string') &&
      (term.difficulty === undefined || ['easy', 'medium', 'hard'].includes(term.difficulty))
    );
  }

  // Convert CustomTerm to FetchedPhrase
  private customTermToFetchedPhrase(
    term: CustomTerm, 
    category: PhraseCategory, 
    fetchedAt: number = Date.now()
  ): FetchedPhrase {
    return {
      phraseId: term.id,
      text: term.phrase.trim(),
      category,
      source: 'openai',
      fetchedAt,
      difficulty: term.difficulty
    };
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

      const newPhrases = await this.requestPhrasesFromOpenAI();
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
      const lastFetch = (await this.getFromStorage(LAST_FETCH_KEY) as number | null) || 0;
      const now = Date.now();
      return (now - lastFetch) >= FETCH_INTERVAL_MS;
    } catch {
      return true; // Default to allowing fetch if we can't check
    }
  }

  private async isDailyQuotaExceeded(): Promise<boolean> {
    try {
      const today = new Date().toDateString();
      const usageData = (await this.getFromStorage(DAILY_USAGE_KEY) as { date: string; count: number } | null) || { date: today, count: 0 };
      
      // Reset if new day
      if (usageData.date !== today) {
        await this.setInStorage(DAILY_USAGE_KEY, { date: today, count: 0 });
        return false;
      }
      
      return usageData.count >= DAILY_QUOTA_LIMIT_REQ;
    } catch {
      return false; // Allow if we can't check
    }
  }

  private async requestPhrasesFromOpenAI(): Promise<FetchedPhrase[]> {
    const categories = Object.values(PhraseCategory);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    
    // Generate UUIDs for the batch request
    const phraseIds = this.generateUUIDs(PHRASES_PER_REQUEST);
    
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: randomCategory,
        batchSize: PHRASES_PER_REQUEST,
        phraseIds: phraseIds,
      }),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid OpenAI API key');
      } else if (response.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }
    }

    const data: OpenAIResponse = await response.json();
    
    // Check if response is an error using type guard
    if (this.isOpenAIErrorResponse(data)) {
      throw new Error(data.error);
    }

    // Response is a success array of CustomTerm objects
    const customTerms = data as CustomTerm[];
    
    if (!Array.isArray(customTerms)) {
      throw new Error('Invalid response format from OpenAI API');
    }

    // Validate and filter terms using type guard
    const validTerms = customTerms.filter(term => this.isValidCustomTerm(term));

    if (validTerms.length === 0) {
      throw new Error('No valid phrases received from OpenAI API');
    }

    // Convert CustomTerm objects to FetchedPhrase objects using utility function
    const phrases: FetchedPhrase[] = validTerms.map(term => 
      this.customTermToFetchedPhrase(term, randomCategory)
    );

    // Update daily usage
    await this.incrementDailyUsage();

    return phrases;
  }

  private async deduplicatePhrases(newPhrases: FetchedPhrase[]): Promise<FetchedPhrase[]> {
    try {
      const existingPhrases = (await this.getFromStorage(FETCHED_PHRASES_KEY) as FetchedPhrase[] | null) || [];
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
      const existingPhrases = (await this.getFromStorage(FETCHED_PHRASES_KEY) as FetchedPhrase[] | null) || [];
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
    const usageData = (await this.getFromStorage(DAILY_USAGE_KEY) as { date: string; count: number } | null) || { date: today, count: 0 };
    
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
      const lastFetch = (await this.getFromStorage(LAST_FETCH_KEY) as number | null) || 0;
      const usageData = (await this.getFromStorage(DAILY_USAGE_KEY) as { date: string; count: number } | null) || { date: new Date().toDateString(), count: 0 };
      const phrasesCount = ((await this.getFromStorage(FETCHED_PHRASES_KEY) as FetchedPhrase[] | null) || []).length;
      
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
      const phrases = (await this.getFromStorage(FETCHED_PHRASES_KEY) as FetchedPhrase[] | null) || [];
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

  private postMessage(message: { type: string; [key: string]: unknown }) {
    self.postMessage(message);
  }

  // Simple IndexedDB wrapper for worker context
  private async getFromStorage(key: string): Promise<unknown> {
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

  private async setInStorage(key: string, value: unknown): Promise<void> {
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

// Initialize the worker with error handling
try {
  new PhraseWorker();
  console.log('PhraseWorker initialized successfully with OpenAI API');
} catch (error) {
  console.error('Failed to initialize PhraseWorker:', error);
  self.postMessage({
    type: 'ERROR',
    error: `Worker initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
  });
} 
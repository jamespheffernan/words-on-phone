/// <reference lib="webworker" />

// Inline const object to avoid import issues in worker context (plain JS for compatibility)
const PhraseCategory = {
  EVERYTHING: 'Everything',
  MOVIES: 'Movies & TV',
  MUSIC: 'Music & Artists',
  SPORTS: 'Sports & Athletes',
  FOOD: 'Food & Drink',
  PLACES: 'Places & Travel',
  PEOPLE: 'Famous People',
  TECHNOLOGY: 'Technology & Science',
  HISTORY: 'History & Events',
  ENTERTAINMENT: 'Entertainment & Pop Culture',
  NATURE: 'Nature & Animals'
};



// Type definitions using JSDoc for JavaScript compatibility
/**
 * @typedef {Object} CustomTerm
 * @property {string} id
 * @property {string} [topic]
 * @property {string} phrase
 * @property {"easy" | "medium" | "hard"} [difficulty]
 */

/**
 * @typedef {Object} FetchedPhrase
 * @property {string} phraseId
 * @property {string} text
 * @property {string} category
 * @property {'openai'} source
 * @property {number} fetchedAt
 * @property {"easy" | "medium" | "hard"} [difficulty]
 */

// Environment configuration - now uses OpenAI serverless function
const OPENAI_API_URL = self.location?.hostname === 'localhost' && self.location?.port === '5173'
  ? 'http://localhost:8888/.netlify/functions/openai'  // Development: Netlify Dev on port 8888
  : '/.netlify/functions/openai'; // Production: same domain

const FETCH_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
const DAILY_QUOTA_LIMIT = 1000;
const PHRASES_PER_REQUEST = 15; // Optimized batch size to stay within Netlify 10s timeout limit

// Storage keys for IndexedDB
const LAST_FETCH_KEY = 'lastPhraseFetch';
const DAILY_USAGE_KEY = 'dailyOpenAIUsage'; // Updated key name
const FETCHED_PHRASES_KEY = 'fetchedPhrases';

// Worker state
let isRunning = false;
const FETCH_INTERVAL_MS = FETCH_INTERVAL;
const DAILY_QUOTA_LIMIT_REQ = DAILY_QUOTA_LIMIT;

// UUID generation for OpenAI requests
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class PhraseWorker {
  constructor() {
    this.abortController = null;
    this.setupEventListeners();
    this.scheduleNextFetch();
    console.log('PhraseWorker initialized successfully with OpenAI API');
  }

  setupEventListeners() {
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
  async fetchPhrases(manual = false) {
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
          count,
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
  async shouldFetch() {
    try {
      const lastFetch = (await this.getFromStorage(LAST_FETCH_KEY) || 0;
      const now = Date.now();
      return (now - lastFetch) >= FETCH_INTERVAL_MS;
    } catch {
      return true; // Default to allowing fetch if we can't check
    }
  }
  async isDailyQuotaExceeded() {
    try {
      const today = new Date().toDateString();
      const usageData = (await this.getFromStorage(DAILY_USAGE_KEY)) || { date, count: 0 };
      
      // Reset if new day
      if (usageData.date !== today) {
        await this.setInStorage(DAILY_USAGE_KEY, { date, count: 0 });
        return false;
      }
      
      return usageData.count >= DAILY_QUOTA_LIMIT_REQ;
    } catch {
      return false; // Allow if we can't check
    }
  }
  async requestPhrasesFromOpenAI() {
    const categories = Object.values(PhraseCategory);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    
    // Generate UUIDs for the phrases
    const phraseIds = Array.from({ length: PHRASES_PER_REQUEST }, () => generateUUID());

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        batchSize,
        phraseIds,
      }),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid OpenAI API key');
      } else if (response.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      } else {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
    }

    const data = await response.json();
    
    // Check if it's an error response
    if ('error' in data) {
      throw new Error(`OpenAI API error: ${data.error}`);
    }

    // Validate the response is an array
    if (!Array.isArray(data)) {
      throw new Error('OpenAI response is not an array');
    }

    // Convert CustomTerm objects to FetchedPhrase objects
    const phrases = data.map((term) => ({
      phraseId: term.id,
      text: term.phrase,
      category,
      source: 'openai',
      fetchedAt: Date.now(),
      difficulty: term.difficulty,
    }));

    // Update daily usage
    await this.incrementDailyUsage();

    return phrases;
  }
  async deduplicatePhrases(newPhrases) {
    try {
      const existingPhrases = (await this.getFromStorage(FETCHED_PHRASES_KEY) || [];
      const existingTexts = new Set(existingPhrases.map((p) => p.text.toLowerCase()));
      
      return newPhrases.filter(phrase => 
        !existingTexts.has(phrase.text.toLowerCase())
      );
    } catch {
      return newPhrases; // Return all if we can't check
    }
  }
  async storePhrases(phrases) {
    try {
      const existingPhrases = (await this.getFromStorage(FETCHED_PHRASES_KEY) || [];
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
  async updateFetchMetadata() {
    await this.setInStorage(LAST_FETCH_KEY, Date.now());
  }
  async incrementDailyUsage() {
    const today = new Date().toDateString();
    const usageData = (await this.getFromStorage(DAILY_USAGE_KEY)) || { date, count: 0 };
    
    if (usageData.date !== today) {
      // New day, reset counter
      await this.setInStorage(DAILY_USAGE_KEY, { date, count: 1 });
    } else {
      // Increment existing counter
      await this.setInStorage(DAILY_USAGE_KEY, { 
        date, 
        count: usageData.count + 1 
      });
    }
  }
  async sendStatus() {
    try {
      const lastFetch = (await this.getFromStorage(LAST_FETCH_KEY) || 0;
      const usageData = (await this.getFromStorage(DAILY_USAGE_KEY)) || { date: new Date().toDateString(), count: 0 };
      const phrasesCount = ((await this.getFromStorage(FETCHED_PHRASES_KEY) || []).length;
      
      this.postMessage({
        type: 'STATUS',
        status: {
          lastFetch,
          dailyUsage: usageData.count,
          dailyQuotaLimit,
          fetchedPhrasesCount,
          nextFetchIn: Math.max(0, FETCH_INTERVAL_MS - (Date.now() - lastFetch)),
          apiKeyAvailable,
        }
      });
    } catch (error) {
      this.postMessage({
        type: 'STATUS_ERROR',
        error: error instanceof Error ? error.message : 'Failed to get status'
      });
    }
  }
  async sendStoredPhrases() {
    try {
      const phrases = (await this.getFromStorage(FETCHED_PHRASES_KEY) || [];
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
  scheduleNextFetch() {
    // Check every hour if it's time to fetch
    const checkInterval = 60 * 60 * 1000; // 1 hour
    
    setInterval(async () => {
      if (await this.shouldFetch()) {
        this.fetchPhrases();
      }
    }, checkInterval);
  }
  cleanup() {
    isRunning = false;
    if (this.abortController) {
      this.abortController.abort();
    }
    this.postMessage({ type: 'WORKER_STOPPED' });
  }
  postMessage(message) {
    self.postMessage(message);
  }

  // Simple IndexedDB wrapper for worker context
  async getFromStorage(key) {
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
  async setInStorage(key) {
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
  async startPeriodicFetching() {
    if (isRunning) {
      this.postMessage({ type: 'ALREADY_RUNNING' });
      return;
    }

    isRunning = true;
    this.postMessage({ type: 'WORKER_STARTED' });

    // Start with an immediate fetch if it's been a while
    if (await this.shouldFetch()) {
      this.fetchPhrases();
    }
  }
}

// Initialize the worker
new PhraseWorker(); 
import { PhraseCategory } from '../data/phrases';
import { env } from '../config/environment';

interface CustomCategoryRequest {
  id: string;
  categoryName: string;
  requestedAt: number;
  sampleWords: string[];
  phrasesGenerated: number;
  status: 'pending' | 'confirmed' | 'generated' | 'failed';
  error?: string;
}

interface FetchedPhrase {
  phraseId: string;
  text: string;
  category: PhraseCategory;
  source: 'openai';
  fetchedAt: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface CustomCategoryPhrase extends Omit<FetchedPhrase, 'category'> {
  customCategory: string;
  category: PhraseCategory.EVERYTHING;
}

// OpenAI API Response Interface (matches CustomTerm from implementation plan)
interface CustomTerm {
  id: string;
  topic?: string;
  phrase: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

// OpenAI API Success/Error Response types
type OpenAISuccessResponse = CustomTerm[];
interface OpenAIErrorResponse {
  error: string;
}
type OpenAIResponse = OpenAISuccessResponse | OpenAIErrorResponse;

const OPENAI_API_URL = env.OPENAI_API_URL;
const DAILY_QUOTA_LIMIT = env.DAILY_CATEGORY_QUOTA;
const SAMPLE_WORDS_COUNT = 3;
const PHRASES_PER_CATEGORY = env.PHRASES_PER_CATEGORY;

// Storage keys
const DAILY_CATEGORY_USAGE_KEY = 'dailyCategoryUsage';

export class CategoryRequestService {
  private dbName = 'words-on-phone-categories';
  private requestsStoreName = 'categoryRequests';
  private phrasesStoreName = 'customPhrases';

  constructor() {
    this.initializeDB();
  }

  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Requests store
        if (!db.objectStoreNames.contains(this.requestsStoreName)) {
          const requestsStore = db.createObjectStore(this.requestsStoreName, { keyPath: 'id' });
          requestsStore.createIndex('requestedAt', 'requestedAt', { unique: false });
          requestsStore.createIndex('status', 'status', { unique: false });
        }

        // Custom phrases store
        if (!db.objectStoreNames.contains(this.phrasesStoreName)) {
          const phrasesStore = db.createObjectStore(this.phrasesStoreName, { keyPath: 'phraseId' });
          phrasesStore.createIndex('customCategory', 'customCategory', { unique: false });
          phrasesStore.createIndex('fetchedAt', 'fetchedAt', { unique: false });
        }
      };
    });
  }

  // Generate UUID for phrase IDs
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

  async canMakeRequest(): Promise<{ canMake: boolean; reason?: string; remainingToday: number }> {
    try {
      const today = new Date().toDateString();
      const usageData = (await this.getFromStorage(DAILY_CATEGORY_USAGE_KEY) as { date: string; count: number } | null) || { date: today, count: 0 };
      
      // Reset counter if it's a new day
      if (usageData.date !== today) {
        await this.setInStorage(DAILY_CATEGORY_USAGE_KEY, { date: today, count: 0 });
        return { canMake: true, remainingToday: DAILY_QUOTA_LIMIT };
      }
      
      const remaining = DAILY_QUOTA_LIMIT - usageData.count;
      
      if (remaining <= 0) {
        return { 
          canMake: false, 
          reason: 'Daily limit reached. Try again tomorrow.', 
          remainingToday: 0 
        };
      }
      
      return { canMake: true, remainingToday: remaining };
    } catch (error) {
      console.warn('Error checking request quota:', error);
      return { canMake: true, remainingToday: DAILY_QUOTA_LIMIT };
    }
  }

  async requestSampleWords(categoryName: string): Promise<string[]> {
    const quotaCheck = await this.canMakeRequest();
    if (!quotaCheck.canMake) {
      throw new Error(quotaCheck.reason || 'Cannot make request at this time');
    }

    // Create request record
    const requestId = this.generateRequestId(categoryName);
    const request: CustomCategoryRequest = {
      id: requestId,
      categoryName,
      requestedAt: Date.now(),
      sampleWords: [],
      phrasesGenerated: 0,
      status: 'pending'
    };

    await this.saveRequest(request);

    try {
      // Generate UUIDs for sample words request
      const phraseIds = this.generateUUIDs(SAMPLE_WORDS_COUNT);
      
      const response = await this.callOpenAI(categoryName, SAMPLE_WORDS_COUNT, phraseIds);
      const customTerms = this.parseOpenAIResponse(response, 'sample');

      if (customTerms.length < 2) {
        throw new Error('Could not generate enough sample words. Please try a different category.');
      }

      // Extract just the phrase text for sample words
      const sampleWords = customTerms.map(term => term.phrase);
      
      // Update request with sample words
      request.sampleWords = sampleWords.slice(0, SAMPLE_WORDS_COUNT);
      request.status = 'confirmed';
      await this.saveRequest(request);

      // Increment daily usage
      await this.incrementDailyUsage();

      return request.sampleWords;
    } catch (error) {
      request.status = 'failed';
      request.error = error instanceof Error ? error.message : 'Unknown error';
      await this.saveRequest(request);
      throw error;
    }
  }

  async generateFullCategory(categoryName: string, sampleWords: string[]): Promise<CustomCategoryPhrase[]> {
    // Find existing request
    const requestId = this.generateRequestId(categoryName);
    let existingRequest = await this.getRequest(requestId);
    
    if (!existingRequest) {
      // Create a new request if it doesn't exist (fallback)
      existingRequest = {
        id: requestId,
        categoryName,
        requestedAt: Date.now(),
        sampleWords,
        phrasesGenerated: 0,
        status: 'confirmed'
      };
      await this.saveRequest(existingRequest);
    }

    try {
      // Generate UUIDs for full category request
      const phraseIds = this.generateUUIDs(PHRASES_PER_CATEGORY);
      
      const response = await this.callOpenAI(categoryName, PHRASES_PER_CATEGORY, phraseIds);
      const customTerms = this.parseOpenAIResponse(response, 'full');

      if (customTerms.length < 20) {
        throw new Error(`Only generated ${customTerms.length} phrases. Expected at least 20.`);
      }

      // Convert CustomTerm objects to CustomCategoryPhrase objects
      const customPhrases: CustomCategoryPhrase[] = customTerms.map(term => ({
        phraseId: term.id,
        text: term.phrase.trim(),
        customCategory: categoryName,
        category: PhraseCategory.EVERYTHING,
        source: 'openai' as const,
        fetchedAt: Date.now(),
        difficulty: term.difficulty
      }));

      // Remove duplicates and save to database
      const deduplicatedPhrases = await this.deduplicateCustomPhrases(customPhrases);
      await this.saveCustomPhrases(deduplicatedPhrases);

      // Update request record
      existingRequest.status = 'generated';
      existingRequest.phrasesGenerated = deduplicatedPhrases.length;
      await this.saveRequest(existingRequest);

      return deduplicatedPhrases;
    } catch (error) {
      existingRequest.status = 'failed';
      existingRequest.error = error instanceof Error ? error.message : 'Unknown error';
      await this.saveRequest(existingRequest);
      throw error;
    }
  }

  async getCustomPhrases(): Promise<CustomCategoryPhrase[]> {
    return this.getAllCustomPhrasesFromDB();
  }

  async getCustomPhrasesByCategory(categoryName: string): Promise<string[]> {
    const allCustomPhrases = await this.getCustomPhrases();
    return allCustomPhrases
      .filter(phrase => phrase.customCategory === categoryName)
      .map(phrase => phrase.text);
  }

  async getAllCustomCategories(): Promise<string[]> {
    const allCustomPhrases = await this.getCustomPhrases();
    const categories = new Set(allCustomPhrases.map(phrase => phrase.customCategory));
    return Array.from(categories).sort();
  }

  async deleteCustomCategory(categoryName: string): Promise<void> {
    try {
      // Get all phrases for this category
      const phrasesToDelete = await this.getCustomPhrasesByCategory(categoryName);
      
      if (phrasesToDelete.length === 0) {
        console.warn(`No phrases found for category: ${categoryName}`);
        return;
      }

      // Delete phrases from database
      await this.deleteCustomPhrasesFromDB(categoryName);
      
      // Delete any associated request records
      await this.deleteRequestByCategory(categoryName);
      
      console.log(`Deleted ${phrasesToDelete.length} phrases from category: ${categoryName}`);
    } catch (error) {
      console.error(`Failed to delete custom category ${categoryName}:`, error);
      throw error;
    }
  }

  // Private helper methods
  private async callOpenAI(topic: string, batchSize: number, phraseIds: string[]): Promise<OpenAIResponse> {
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
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid OpenAI API key configuration.');
      } else if (response.status === 429) {
        throw new Error('API rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
    }

    const data: OpenAIResponse = await response.json();
    return data;
  }

  private parseOpenAIResponse(response: OpenAIResponse, requestType: 'sample' | 'full'): CustomTerm[] {
    // Check if response is an error
    if ('error' in response) {
      throw new Error(response.error);
    }

    // Response is a success array of CustomTerm objects
    const customTerms = response as CustomTerm[];
    
    if (!Array.isArray(customTerms)) {
      throw new Error('Invalid response format from OpenAI API');
    }

    // Validate and filter terms
    const validTerms = customTerms.filter(term => {
      return term.id && term.phrase && term.phrase.trim().length > 0;
    });

    if (validTerms.length === 0) {
      throw new Error('No valid phrases received from OpenAI API');
    }

    const expectedCount = requestType === 'sample' ? SAMPLE_WORDS_COUNT : PHRASES_PER_CATEGORY;
    return validTerms.slice(0, expectedCount);
  }

  private generateRequestId(categoryName: string): string {
    // Use deterministic ID based only on category name (no timestamp)
    return `req_${categoryName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  }

  private generatePhraseId(text: string, category: string): string {
    const normalized = text.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const categoryPrefix = category.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `custom_${categoryPrefix}_${normalized}_${Date.now()}`;
  }

  private async deduplicateCustomPhrases(newPhrases: CustomCategoryPhrase[]): Promise<CustomCategoryPhrase[]> {
    const existingPhrases = await this.getAllCustomPhrasesFromDB();
    const existingTexts = new Set(existingPhrases.map(p => p.text.toLowerCase()));

    return newPhrases.filter(phrase => 
      !existingTexts.has(phrase.text.toLowerCase())
    );
  }

  private async incrementDailyUsage(): Promise<void> {
    const today = new Date().toDateString();
    const usageData = (await this.getFromStorage(DAILY_CATEGORY_USAGE_KEY) as { date: string; count: number } | null) || { date: today, count: 0 };
    
    if (usageData.date !== today) {
      await this.setInStorage(DAILY_CATEGORY_USAGE_KEY, { date: today, count: 1 });
    } else {
      await this.setInStorage(DAILY_CATEGORY_USAGE_KEY, { 
        date: today, 
        count: usageData.count + 1 
      });
    }
  }

  // Database operations
  private async saveRequest(request: CustomCategoryRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbRequest = indexedDB.open(this.dbName, 1);
      
      dbRequest.onsuccess = () => {
        const db = dbRequest.result;
        const transaction = db.transaction([this.requestsStoreName], 'readwrite');
        const store = transaction.objectStore(this.requestsStoreName);
        
        const putRequest = store.put(request);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      dbRequest.onerror = () => reject(dbRequest.error);
    });
  }

  private async getRequest(requestId: string): Promise<CustomCategoryRequest | null> {
    return new Promise((resolve, reject) => {
      const dbRequest = indexedDB.open(this.dbName, 1);
      
      dbRequest.onsuccess = () => {
        const db = dbRequest.result;
        const transaction = db.transaction([this.requestsStoreName], 'readonly');
        const store = transaction.objectStore(this.requestsStoreName);
        
        const getRequest = store.get(requestId);
        getRequest.onsuccess = () => resolve(getRequest.result || null);
        getRequest.onerror = () => reject(getRequest.error);
      };
      
      dbRequest.onerror = () => reject(dbRequest.error);
    });
  }

  private async saveCustomPhrases(phrases: CustomCategoryPhrase[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbRequest = indexedDB.open(this.dbName, 1);
      
      dbRequest.onsuccess = () => {
        const db = dbRequest.result;
        const transaction = db.transaction([this.phrasesStoreName], 'readwrite');
        const store = transaction.objectStore(this.phrasesStoreName);
        
        let completed = 0;
        const total = phrases.length;
        
        if (total === 0) {
          resolve();
          return;
        }
        
        phrases.forEach(phrase => {
          const addRequest = store.put(phrase);
          
          addRequest.onsuccess = () => {
            completed++;
            if (completed === total) resolve();
          };
          
          addRequest.onerror = () => {
            completed++;
            if (completed === total) resolve();
          };
        });
      };
      
      dbRequest.onerror = () => reject(dbRequest.error);
    });
  }

  private async getAllCustomPhrasesFromDB(): Promise<CustomCategoryPhrase[]> {
    return new Promise((resolve, reject) => {
      const dbRequest = indexedDB.open(this.dbName, 1);
      
      dbRequest.onsuccess = () => {
        const db = dbRequest.result;
        const transaction = db.transaction([this.phrasesStoreName], 'readonly');
        const store = transaction.objectStore(this.phrasesStoreName);
        
        const getAllRequest = store.getAll();
        getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
        getAllRequest.onerror = () => reject(getAllRequest.error);
      };
      
      dbRequest.onerror = () => reject(dbRequest.error);
    });
  }

  private async getFromStorage(key: string): Promise<unknown> {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  private async setInStorage(key: string, value: unknown): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  private async deleteCustomPhrasesFromDB(categoryName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbRequest = indexedDB.open(this.dbName, 1);
      
      dbRequest.onsuccess = () => {
        const db = dbRequest.result;
        const transaction = db.transaction([this.phrasesStoreName], 'readwrite');
        const store = transaction.objectStore(this.phrasesStoreName);
        const index = store.index('customCategory');
        
        const getRequest = index.getAll(categoryName);
        
        getRequest.onsuccess = () => {
          const phrases = getRequest.result;
          let deletedCount = 0;
          
          if (phrases.length === 0) {
            resolve();
            return;
          }
          
          phrases.forEach(phrase => {
            const deleteRequest = store.delete(phrase.phraseId);
            
            deleteRequest.onsuccess = () => {
              deletedCount++;
              if (deletedCount === phrases.length) {
                resolve();
              }
            };
            
            deleteRequest.onerror = () => {
              deletedCount++;
              if (deletedCount === phrases.length) {
                resolve();
              }
            };
          });
        };
        
        getRequest.onerror = () => reject(getRequest.error);
      };
      
      dbRequest.onerror = () => reject(dbRequest.error);
    });
  }

  private async deleteRequestByCategory(categoryName: string): Promise<void> {
    const requestId = this.generateRequestId(categoryName);
    
    return new Promise((resolve, reject) => {
      const dbRequest = indexedDB.open(this.dbName, 1);
      
      dbRequest.onsuccess = () => {
        const db = dbRequest.result;
        const transaction = db.transaction([this.requestsStoreName], 'readwrite');
        const store = transaction.objectStore(this.requestsStoreName);
        
        const deleteRequest = store.delete(requestId);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => resolve(); // Don't fail if request doesn't exist
      };
      
      dbRequest.onerror = () => reject(dbRequest.error);
    });
  }
}

// Singleton instance
export const categoryRequestService = new CategoryRequestService(); 
import { phrases as staticPhrases, categorizedPhrases, PhraseCategory } from '../data/phrases';
import { categoryRequestService } from './categoryRequestService';

interface FetchedPhrase {
  phraseId: string;
  text: string;
  category: PhraseCategory;
  source: 'gemini';
  fetchedAt: number;
}

interface PhraseServiceState {
  staticPhrases: string[];
  fetchedPhrases: FetchedPhrase[];
  customPhrases: string[];
  allPhrases: string[];
  lastUpdate: number;
}

class PhraseService {
  private state: PhraseServiceState = {
    staticPhrases: staticPhrases,
    fetchedPhrases: [],
    customPhrases: [],
    allPhrases: staticPhrases,
    lastUpdate: Date.now(),
  };

  private dbName = 'words-on-phone-phrases';
  private storeName = 'fetchedPhrases';

  // Add a custom category cache
  private customCategoryPhrases: Record<string, string[]> = {};

  constructor() {
    this.initializeDB();
    this.loadFetchedPhrases();
    this.loadCustomPhrases();
  }

  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'phraseId' });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('fetchedAt', 'fetchedAt', { unique: false });
        }
      };
    });
  }

  private async loadFetchedPhrases(): Promise<void> {
    try {
      const fetchedPhrases = await this.getAllFetchedPhrasesFromDB();
      this.state.fetchedPhrases = fetchedPhrases;
      this.updateAllPhrases();
    } catch (error) {
      console.warn('Failed to load fetched phrases:', error);
    }
  }

  private async loadCustomPhrases(): Promise<void> {
    try {
      const customPhrases = await categoryRequestService.getCustomPhrases();
      this.state.customPhrases = customPhrases.map(p => p.text);
      
      // Organize custom phrases by category for efficient lookup
      this.customCategoryPhrases = {};
      customPhrases.forEach(phrase => {
        if (!this.customCategoryPhrases[phrase.customCategory]) {
          this.customCategoryPhrases[phrase.customCategory] = [];
        }
        this.customCategoryPhrases[phrase.customCategory].push(phrase.text);
      });
      
      this.updateAllPhrases();
    } catch (error) {
      console.warn('Failed to load custom phrases:', error);
    }
  }

  private async getAllFetchedPhrasesFromDB(): Promise<FetchedPhrase[]> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
          const phrases = getAllRequest.result as FetchedPhrase[];
          resolve(phrases.sort((a, b) => b.fetchedAt - a.fetchedAt));
        };

        getAllRequest.onerror = () => reject(getAllRequest.error);
      };
    });
  }

  async addFetchedPhrases(newPhrases: FetchedPhrase[]): Promise<number> {
    try {
      const deduplicatedPhrases = this.deduplicateAgainstAll(newPhrases);
      
      if (deduplicatedPhrases.length === 0) {
        return 0;
      }

      await this.saveFetchedPhrasesToDB(deduplicatedPhrases);
      this.state.fetchedPhrases.push(...deduplicatedPhrases);
      this.updateAllPhrases();

      return deduplicatedPhrases.length;
    } catch (error) {
      console.error('Failed to add fetched phrases:', error);
      throw error;
    }
  }

  private deduplicateAgainstAll(newPhrases: FetchedPhrase[]): FetchedPhrase[] {
    const existingTexts = new Set([
      ...this.state.staticPhrases.map(p => p.toLowerCase()),
      ...this.state.fetchedPhrases.map(p => p.text.toLowerCase())
    ]);

    return newPhrases.filter(phrase => 
      !existingTexts.has(phrase.text.toLowerCase())
    );
  }

  private async saveFetchedPhrasesToDB(phrases: FetchedPhrase[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);

        let completed = 0;
        const total = phrases.length;

        if (total === 0) {
          resolve();
          return;
        }

        phrases.forEach(phrase => {
          const addRequest = store.add(phrase);
          
          addRequest.onsuccess = () => {
            completed++;
            if (completed === total) {
              resolve();
            }
          };
          
          addRequest.onerror = () => {
            // Phrase might already exist, continue anyway
            completed++;
            if (completed === total) {
              resolve();
            }
          };
        });
      };
    });
  }

  private updateAllPhrases(): void {
    const fetchedTexts = this.state.fetchedPhrases.map(p => p.text);
    this.state.allPhrases = [...this.state.staticPhrases, ...fetchedTexts, ...this.state.customPhrases];
    this.state.lastUpdate = Date.now();
  }

  // Public API methods
  getAllPhrases(): string[] {
    return [...this.state.allPhrases];
  }

  getPhrasesByCategory(category: PhraseCategory | string): string[] {
    if (category === PhraseCategory.EVERYTHING) {
      return this.getAllPhrases();
    }

    // Check if it's a custom category
    if (typeof category === 'string' && !(Object.values(PhraseCategory) as string[]).includes(category)) {
      // It's a custom category - return from cache
      return this.customCategoryPhrases[category] || [];
    }

    // Static phrases for this category
    const staticCategoryPhrases = (category !== PhraseCategory.EVERYTHING && Object.prototype.hasOwnProperty.call(categorizedPhrases, category)) 
      ? categorizedPhrases[category as keyof typeof categorizedPhrases] || []
      : [];

    // Fetched phrases for this category
    const fetchedCategoryPhrases = this.state.fetchedPhrases
      .filter(p => p.category === category)
      .map(p => p.text);

    return [...staticCategoryPhrases, ...fetchedCategoryPhrases];
  }

  getStatistics() {
    return {
      totalPhrases: this.state.allPhrases.length,
      staticPhrases: this.state.staticPhrases.length,
      fetchedPhrases: this.state.fetchedPhrases.length,
      customPhrases: this.state.customPhrases.length,
      lastUpdate: this.state.lastUpdate,
      categoryCounts: Object.values(PhraseCategory).reduce((acc, category) => {
        acc[category] = this.getPhrasesByCategory(category).length;
        return acc;
      }, {} as Record<PhraseCategory, number>)
    };
  }

  async cleanupOldPhrases(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    const cutoff = Date.now() - maxAge;
    const toDelete = this.state.fetchedPhrases.filter(p => p.fetchedAt < cutoff);

    if (toDelete.length === 0) {
      return 0;
    }

    try {
      await this.deleteFetchedPhrasesFromDB(toDelete.map(p => p.phraseId));
      this.state.fetchedPhrases = this.state.fetchedPhrases.filter(p => p.fetchedAt >= cutoff);
      this.updateAllPhrases();
      return toDelete.length;
    } catch (error) {
      console.error('Failed to cleanup old phrases:', error);
      throw error;
    }
  }

  private async deleteFetchedPhrasesFromDB(phraseIds: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);

        let completed = 0;
        const total = phraseIds.length;

        if (total === 0) {
          resolve();
          return;
        }

        phraseIds.forEach(phraseId => {
          const deleteRequest = store.delete(phraseId);
          
          deleteRequest.onsuccess = () => {
            completed++;
            if (completed === total) {
              resolve();
            }
          };
          
          deleteRequest.onerror = () => {
            completed++;
            if (completed === total) {
              resolve();
            }
          };
        });
      };
    });
  }

  // Method for the worker to call when new phrases are available
  async handleWorkerPhrases(phrases: FetchedPhrase[]): Promise<void> {
    const added = await this.addFetchedPhrases(phrases);
    console.log(`Added ${added} new phrases from OpenAI`);
  }

  // Method to refresh custom phrases after new category generation
  async refreshCustomPhrases(): Promise<void> {
    await this.loadCustomPhrases();
  }

  async getCustomCategories(): Promise<string[]> {
    return await categoryRequestService.getAllCustomCategories();
  }

  async handleCustomCategoryDeleted(categoryName: string): Promise<void> {
    // Remove custom category phrases from our cache
    this.state.customPhrases = this.state.customPhrases.filter(() => {
      // For now, we don't have category metadata in our cache
      // The deletion is handled at the service level
      return true;
    });
    
    // Refresh our custom phrases cache from the database
    await this.loadCustomPhrases();
    
    console.log(`Handled deletion of custom category: ${categoryName}`);
  }
}

// Create singleton instance
export const phraseService = new PhraseService();

// Export types for use elsewhere
export type { FetchedPhrase }; 
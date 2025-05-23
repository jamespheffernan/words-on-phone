import { get, set, del } from 'idb-keyval';
import { StateStorage } from 'zustand/middleware';

// IndexedDB storage adapter for Zustand persist middleware
export const indexedDBStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const value = await get(name);
      return value || null;
    } catch (error) {
      console.warn('Failed to get item from IndexedDB:', error);
      return null;
    }
  },
  
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await set(name, value);
    } catch (error) {
      console.warn('Failed to set item in IndexedDB:', error);
    }
  },
  
  removeItem: async (name: string): Promise<void> => {
    try {
      await del(name);
    } catch (error) {
      console.warn('Failed to remove item from IndexedDB:', error);
    }
  },
}; 
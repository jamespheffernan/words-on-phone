import { PhraseCategory } from '../data/phrases';

// OpenAI API Response Interface (matches PhraseMachine prompt schema)
export interface CustomTerm {
  id: string; // UUID echoed from request
  topic?: string; // Optional topic echoed back
  phrase: string; // 1-4 words, Title-case
  difficulty?: 'easy' | 'medium' | 'hard'; // Optional difficulty level
}

// OpenAI API Success/Error Response types
export type OpenAISuccessResponse = CustomTerm[];
export interface OpenAIErrorResponse {
  error: string; // Short error reason
}
export type OpenAIResponse = OpenAISuccessResponse | OpenAIErrorResponse;

// Difficulty levels enum for better type safety
export enum DifficultyLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

// Base interface for all fetched phrases (both category requests and background fetching)
export interface FetchedPhrase {
  phraseId: string; // UUID for OpenAI-generated phrases
  text: string; // The actual phrase text
  category: PhraseCategory; // Category this phrase belongs to
  source: 'openai'; // Source of the phrase (now always OpenAI)
  fetchedAt: number; // Timestamp when phrase was fetched
  difficulty?: DifficultyLevel | string; // Optional difficulty level from OpenAI
}

// Custom category phrase extends FetchedPhrase for user-requested categories
export interface CustomCategoryPhrase extends Omit<FetchedPhrase, 'category'> {
  customCategory: string; // Name of the custom category
  category: PhraseCategory.EVERYTHING; // Custom phrases go in "Everything" category
}

// Request interface for OpenAI API calls
export interface OpenAIRequest {
  topic?: string; // Optional topic/category for phrase generation
  batchSize: number; // Number of phrases to generate (1-100)
  phraseIds: string[]; // Pre-generated UUIDs to be echoed back
}

// Custom category request tracking interface
export interface CustomCategoryRequest {
  id: string; // Deterministic ID based on category name
  categoryName: string; // Name of the requested category
  requestedAt: number; // Timestamp when request was made
  sampleWords: string[]; // Sample words shown to user before confirmation
  phrasesGenerated: number; // Number of phrases successfully generated
  status: 'pending' | 'confirmed' | 'generated' | 'failed'; // Request status
  error?: string; // Error message if status is 'failed'
}

// Type guards for OpenAI responses
export function isOpenAISuccessResponse(response: OpenAIResponse): response is OpenAISuccessResponse {
  return Array.isArray(response);
}

export function isOpenAIErrorResponse(response: OpenAIResponse): response is OpenAIErrorResponse {
  return typeof response === 'object' && 'error' in response;
}

// Type guard for custom terms
export function isValidCustomTerm(term: any): term is CustomTerm {
  return (
    typeof term === 'object' &&
    typeof term.id === 'string' &&
    typeof term.phrase === 'string' &&
    term.phrase.trim().length > 0 &&
    (term.topic === undefined || typeof term.topic === 'string') &&
    (term.difficulty === undefined || ['easy', 'medium', 'hard'].includes(term.difficulty))
  );
}

// Utility functions for phrase management
export function generatePhraseId(): string {
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

export function generatePhraseIds(count: number): string[] {
  return Array.from({ length: count }, () => generatePhraseId());
}

// Convert CustomTerm to FetchedPhrase
export function customTermToFetchedPhrase(
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

// Convert CustomTerm to CustomCategoryPhrase
export function customTermToCustomCategoryPhrase(
  term: CustomTerm, 
  customCategory: string, 
  fetchedAt: number = Date.now()
): CustomCategoryPhrase {
  return {
    phraseId: term.id,
    text: term.phrase.trim(),
    customCategory,
    category: PhraseCategory.EVERYTHING,
    source: 'openai',
    fetchedAt,
    difficulty: term.difficulty
  };
} 
// OpenAI API Types and Utilities for PhraseMachine Integration

import { PhraseCategory } from '../data/phrases';

// Core OpenAI API Types
export interface CustomTerm {
  id: string; // UUID echoed from request
  topic?: string; // Optional topic echoed back
  phrase: string; // 1-4 words, Title-case
  difficulty?: 'easy' | 'medium' | 'hard'; // Optional difficulty
}

export type OpenAISuccessResponse = CustomTerm[];

export interface OpenAIErrorResponse {
  error: string; // Short error reason
}

export type OpenAIResponse = OpenAISuccessResponse | OpenAIErrorResponse;

// Application-specific types
export interface FetchedPhrase {
  phraseId: string;
  text: string;
  category: PhraseCategory;
  source: 'openai'; // Updated to reflect OpenAI source
  fetchedAt: number;
  difficulty?: 'easy' | 'medium' | 'hard'; // Added difficulty field
}

export interface CustomCategoryPhrase {
  phraseId: string;
  text: string;
  customCategory: string;
  source: 'openai';
  fetchedAt: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface CustomCategoryRequest {
  id: string;
  categoryName: string;
  requestedAt: number;
  sampleWords: string[];
  phrasesGenerated: number;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

// Type Guards
export function isOpenAISuccessResponse(response: OpenAIResponse): response is OpenAISuccessResponse {
  return Array.isArray(response);
}

export function isOpenAIErrorResponse(response: OpenAIResponse): response is OpenAIErrorResponse {
  return typeof response === 'object' && 'error' in response;
}

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

// UUID Generation Utilities
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

// Conversion Utilities
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

export function customTermToCustomCategoryPhrase(
  term: CustomTerm, 
  customCategory: string, 
  fetchedAt: number = Date.now()
): CustomCategoryPhrase {
  return {
    phraseId: term.id,
    text: term.phrase.trim(),
    customCategory,
    source: 'openai',
    fetchedAt,
    difficulty: term.difficulty
  };
} 
import { renderHook, waitFor } from '@testing-library/react';
import { usePhrases } from './usePhrases';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('usePhrases', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should load phrases successfully', async () => {
    const mockData = {
      category: 'Test Category',
      phrases: ['Phrase 1', 'Phrase 2', 'Phrase 3']
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData)
    });

    const { result } = renderHook(() => usePhrases());

    expect(result.current.loading).toBe(true);
    expect(result.current.phrases).toEqual([]);
    expect(result.current.error).toBe(null);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.phrases).toEqual([
      { phrase: 'Phrase 1' },
      { phrase: 'Phrase 2' },
      { phrase: 'Phrase 3' }
    ]);
    expect(result.current.error).toBe(null);
  });

  it('should handle fetch errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => usePhrases());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.phrases).toEqual([]);
    expect(result.current.error).toBe('Network error');
  });

  it('should handle invalid JSON format', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ invalid: 'format' })
    });

    const { result } = renderHook(() => usePhrases());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.phrases).toEqual([]);
    expect(result.current.error).toBe('Invalid phrases.json format');
  });

  it('should handle HTTP errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404
    });

    const { result } = renderHook(() => usePhrases());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.phrases).toEqual([]);
    expect(result.current.error).toBe('Failed to load phrases.json');
  });

  it('should maintain phrase order', async () => {
    const mockData = {
      phrases: ['Alpha', 'Beta', 'Gamma', 'Delta']
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData)
    });

    const { result } = renderHook(() => usePhrases());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const phraseTexts = result.current.phrases.map(p => p.phrase);
    expect(phraseTexts).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta']);
  });
}); 
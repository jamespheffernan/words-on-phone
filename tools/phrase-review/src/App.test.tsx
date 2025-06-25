import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// Mock the usePhrases hook
jest.mock('./hooks/usePhrases', () => ({
  usePhrases: () => ({
    phrases: [
      { phrase: 'Test Phrase 1' },
      { phrase: 'Test Phrase 2' },
      { phrase: 'Test Phrase 3' }
    ],
    loading: false,
    error: null
  })
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock URL.createObjectURL for file downloads
Object.defineProperty(URL, 'createObjectURL', {
  value: jest.fn(() => 'mock-url')
});
Object.defineProperty(URL, 'revokeObjectURL', {
  value: jest.fn()
});

// Mock scrollIntoView for test environment
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: jest.fn(),
  writable: true
});

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders phrase review interface', () => {
    render(<App />);
    
    expect(screen.getByText('Phrases (3)')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Test Phrase 1' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('displays current phrase in center panel', () => {
    render(<App />);
    
    const currentPhrase = screen.getByRole('heading', { level: 2 });
    expect(currentPhrase).toHaveTextContent('Test Phrase 1');
  });

  it('navigates with arrow keys', async () => {
    render(<App />);
    
    const currentPhrase = screen.getByRole('heading', { level: 2 });
    expect(currentPhrase).toHaveTextContent('Test Phrase 1');
    
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(currentPhrase).toHaveTextContent('Test Phrase 2');
    
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(currentPhrase).toHaveTextContent('Test Phrase 1');
  });

  it('navigates with j/k keys', async () => {
    render(<App />);
    
    const currentPhrase = screen.getByRole('heading', { level: 2 });
    
    fireEvent.keyDown(window, { key: 'j' });
    expect(currentPhrase).toHaveTextContent('Test Phrase 2');
    
    fireEvent.keyDown(window, { key: 'k' });
    expect(currentPhrase).toHaveTextContent('Test Phrase 1');
  });

  it('jumps to first/last with g/G', async () => {
    render(<App />);
    
    const currentPhrase = screen.getByRole('heading', { level: 2 });
    
    // Move to middle
    fireEvent.keyDown(window, { key: 'j' });
    expect(currentPhrase).toHaveTextContent('Test Phrase 2');
    
    // Jump to last
    fireEvent.keyDown(window, { key: 'g', shiftKey: true });
    expect(currentPhrase).toHaveTextContent('Test Phrase 3');
    
    // Jump to first
    fireEvent.keyDown(window, { key: 'g' });
    expect(currentPhrase).toHaveTextContent('Test Phrase 1');
  });

  it('approves phrases with a key', async () => {
    render(<App />);
    
    fireEvent.keyDown(window, { key: 'a' });
    
    // Check for the status badge in sidebar
    expect(screen.getByLabelText('Status: accepted')).toBeInTheDocument();
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'phraseReview',
      expect.stringContaining('"status":"accepted"')
    );
  });

  it('opens reject modal with r key', async () => {
    render(<App />);
    
    fireEvent.keyDown(window, { key: 'r' });
    
    expect(screen.getByText('Why reject this phrase?')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter rejection reason...')).toBeInTheDocument();
  });

  it('submits rejection with reason', async () => {
    render(<App />);
    
    fireEvent.keyDown(window, { key: 'r' });
    
    const textarea = screen.getByPlaceholderText('Enter rejection reason...');
    await userEvent.type(textarea, 'Too specific');
    fireEvent.keyDown(window, { key: 'Enter' });
    
    // Check for the status badge in sidebar
    expect(screen.getByLabelText('Status: rejected')).toBeInTheDocument();
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'phraseReview',
      expect.stringContaining('"reason":"Too specific"')
    );
  });

  it('cancels rejection with Escape', async () => {
    render(<App />);
    
    fireEvent.keyDown(window, { key: 'r' });
    expect(screen.getByText('Why reject this phrase?')).toBeInTheDocument();
    
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Why reject this phrase?')).not.toBeInTheDocument();
  });

  it('opens search modal with / key', async () => {
    render(<App />);
    
    fireEvent.keyDown(window, { key: '/' });
    
    expect(screen.getByText('Search phrases')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type to search...')).toBeInTheDocument();
  });

  it('searches and jumps to matching phrase', async () => {
    render(<App />);
    
    fireEvent.keyDown(window, { key: '/' });
    
    const searchInput = screen.getByPlaceholderText('Type to search...');
    await userEvent.type(searchInput, 'Phrase 2');
    fireEvent.keyDown(window, { key: 'Enter' });
    
    const currentPhrase = screen.getByRole('heading', { level: 2 });
    expect(currentPhrase).toHaveTextContent('Test Phrase 2');
  });

  it('displays progress statistics', () => {
    render(<App />);
    
    expect(screen.getByText(/Reviewed: 0 • ✅ 0 • ❌ 0/)).toBeInTheDocument();
    expect(screen.getByText('3 pending')).toBeInTheDocument();
  });

  it('restores decisions from localStorage', () => {
    const savedDecisions = JSON.stringify({
      0: { status: 'accepted' },
      1: { status: 'rejected', reason: 'Test reason' }
    });
    mockLocalStorage.getItem.mockReturnValue(savedDecisions);
    
    render(<App />);
    
    expect(screen.getByText(/Reviewed: 2 • ✅ 1 • ❌ 1/)).toBeInTheDocument();
    expect(screen.getByText('1 pending')).toBeInTheDocument();
  });

  it('shows keyboard shortcuts help', () => {
    render(<App />);
    
    // Just check that the keyboard shortcuts region exists with content
    const shortcutsRegion = screen.getByRole('region', { name: 'Keyboard shortcuts' });
    expect(shortcutsRegion).toBeInTheDocument();
    expect(shortcutsRegion).toHaveTextContent('a');
    expect(shortcutsRegion).toHaveTextContent('r');
    expect(shortcutsRegion).toHaveTextContent('/');
  });

  it('has proper ARIA labels and roles', () => {
    render(<App />);
    
    expect(screen.getByRole('navigation', { name: 'Phrase list' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: 'Phrase list' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
  });

  it('provides screen reader announcements', () => {
    render(<App />);
    
    const srAnnouncement = screen.getByText(/Current phrase: Test Phrase 1/);
    expect(srAnnouncement).toHaveClass('sr-only');
    expect(srAnnouncement).toHaveAttribute('aria-live', 'polite');
  });

  it('handles save functionality', () => {
    render(<App />);
    
    // Make a decision first
    fireEvent.keyDown(window, { key: 'a' });
    
    // Verify localStorage was called
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'phraseReview',
      expect.stringContaining('"status":"accepted"')
    );
  });


});

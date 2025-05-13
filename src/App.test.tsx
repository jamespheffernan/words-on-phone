import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Mock the Layout component
vi.mock('./components/Layout', () => ({
  default: ({ darkMode, onToggleDarkMode }: { darkMode: boolean, onToggleDarkMode: (enabled: boolean) => void }) => 
    <div data-testid="mock-layout">Layout Component Mock</div>
}));

// Mock the TimerProvider component
vi.mock('./components/TimerProvider', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-timer-provider">{children}</div>
}));

// Mock the storage functions
vi.mock('./utils/storage', () => ({
  hasCompletedOnboarding: vi.fn().mockResolvedValue(true),
  markOnboardingCompleted: vi.fn().mockResolvedValue(undefined),
  getDarkMode: vi.fn().mockResolvedValue(false),
  toggleDarkMode: vi.fn().mockResolvedValue(undefined)
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('renders the Words on Phone title', async () => {
    render(<App />);
    
    // Wait for the loading state to resolve
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText(/Words on Phone/i)).toBeInTheDocument();
  });

  it('renders the layout component', async () => {
    render(<App />);
    
    // Wait for the loading state to resolve
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    expect(screen.getByTestId('mock-layout')).toBeInTheDocument();
  });
}); 
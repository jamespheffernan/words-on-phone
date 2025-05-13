import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the Layout component
vi.mock('./components/Layout', () => ({
  default: () => <div data-testid="mock-layout">Layout Component Mock</div>
}));

// Mock the TimerProvider component to avoid Zustand infinite loop
vi.mock('./components/TimerProvider', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-timer-provider">{children}</div>
}));

describe('App', () => {
  it('renders the Words on Phone title', () => {
    render(<App />);
    expect(screen.getByText(/Words on Phone/i)).toBeInTheDocument();
  });

  it('renders the layout component', () => {
    render(<App />);
    expect(screen.getByTestId('mock-layout')).toBeInTheDocument();
  });
}); 
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Layout from './Layout';

// Mock Game and Settings components
vi.mock('./Game', () => ({
  default: () => <div data-testid="mock-game">Game Component Mock</div>
}));

vi.mock('./Settings', () => ({
  default: () => <div data-testid="mock-settings">Settings Component Mock</div>
}));

describe('Layout', () => {
  it('should render the game by default', () => {
    render(<Layout darkMode={false} onToggleDarkMode={() => {}} />);
    expect(screen.getByTestId('mock-game')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-settings')).not.toBeInTheDocument();
  });
  
  it('should render settings when settings tab is clicked', () => {
    render(<Layout darkMode={false} onToggleDarkMode={() => {}} />);
    
    // Click on settings tab
    fireEvent.click(screen.getByText(/Settings/i));
    
    expect(screen.getByTestId('mock-settings')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-game')).not.toBeInTheDocument();
  });
  
  it('should switch back to game when game tab is clicked', () => {
    render(<Layout darkMode={false} onToggleDarkMode={() => {}} />);
    
    // First go to settings
    fireEvent.click(screen.getByText(/Settings/i));
    
    // Then back to game
    fireEvent.click(screen.getByText(/Game/i));
    
    expect(screen.getByTestId('mock-game')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-settings')).not.toBeInTheDocument();
  });
}); 
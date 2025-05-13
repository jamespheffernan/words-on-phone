import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import Onboarding from './Onboarding';

// Mock the haptics module
vi.mock('../utils/haptics', () => ({
  vibrate: vi.fn(),
  vibrateSuccess: vi.fn(),
  vibrateError: vi.fn(),
  vibrateWarning: vi.fn(),
  ImpactStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy'
  }
}));

describe('Onboarding Component', () => {
  const mockOnComplete = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the first step of the tutorial', () => {
    render(<Onboarding onComplete={mockOnComplete} />);
    
    // Check for welcome text
    expect(screen.getByText('Welcome to Words on Phone!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
    expect(screen.queryByText('Got it!')).not.toBeInTheDocument();
  });

  it('moves to the next step when Next button is clicked', async () => {
    render(<Onboarding onComplete={mockOnComplete} />);
    
    // Click the Next button
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    
    // Check for step 2 content (needs to handle state update)
    expect(await screen.findByText('How to Play')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
  });

  it('calls onComplete when the last step is completed', async () => {
    render(<Onboarding onComplete={mockOnComplete} />);
    
    // Advance to the last step
    fireEvent.click(screen.getByRole('button', { name: /Next/i })); // Step 1 -> 2
    await screen.findByText('How to Play');
    
    fireEvent.click(screen.getByRole('button', { name: /Next/i })); // Step 2 -> 3
    await screen.findByText('Surprise Timer');
    
    fireEvent.click(screen.getByRole('button', { name: /Next/i })); // Step 3 -> 4
    await screen.findByText('Ready to Play?');
    
    // Now on the last step, should have "Got it!" button
    const gotItButton = await screen.findByRole('button', { name: /Got it!/i });
    expect(gotItButton).toBeInTheDocument();
    
    // Click the final button
    fireEvent.click(gotItButton);
    
    // Wait for onComplete to be called (since it's called after an async haptics call)
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it('shows the correct step indicator', async () => {
    render(<Onboarding onComplete={mockOnComplete} />);
    
    // Step 1
    expect(screen.getByText('1/4')).toBeInTheDocument();
    
    // Advance to step 2
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    
    // Check that step indicator updated
    expect(await screen.findByText('2/4')).toBeInTheDocument();
  });
  
  it('applies light theme styles by default', () => {
    render(<Onboarding onComplete={mockOnComplete} />);
    
    // Find container div and check its classes
    const container = screen.getByText('Welcome to Words on Phone!').closest('.rounded-lg');
    
    expect(container).toHaveClass('bg-white');
    expect(container).not.toHaveClass('bg-gray-800');
  });
  
  it('applies dark theme styles when darkMode is true', () => {
    render(<Onboarding onComplete={mockOnComplete} darkMode={true} />);
    
    // Find container div and check its classes
    const container = screen.getByText('Welcome to Words on Phone!').closest('.rounded-lg');
    
    expect(container).toHaveClass('bg-gray-800');
    expect(container).not.toHaveClass('bg-white');
  });
}); 
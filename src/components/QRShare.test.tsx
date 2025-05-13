import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import QRShare from './QRShare';

// Mock the haptics functions and ImpactStyle
vi.mock('../utils/haptics', () => ({
  vibrate: vi.fn(),
  vibrateSuccess: vi.fn(),
  vibrateError: vi.fn(),
  vibrateWarning: vi.fn(),
  // Import actual ImpactStyle from @capacitor/haptics rather than mocking it
  ImpactStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy'
  }
}));

// Mock the clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined)
  }
});

// Mock the Web Share API
Object.defineProperty(navigator, 'share', {
  value: vi.fn().mockResolvedValue(undefined)
});

describe('QRShare Component', () => {
  const mockOnClose = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('renders the QR code and app URL', () => {
    render(<QRShare darkMode={false} onClose={mockOnClose} />);
    
    expect(screen.getByText('Share Words on Phone')).toBeInTheDocument();
    expect(screen.getByText('https://words-on-phone.netlify.app')).toBeInTheDocument();
    expect(screen.getByText('Scan this code to open Words on Phone')).toBeInTheDocument();
  });
  
  it('calls onClose when close button is clicked', () => {
    render(<QRShare darkMode={false} onClose={mockOnClose} />);
    
    // Find and click close button (it has an SVG inside)
    const closeButton = screen.getByRole('button', { name: '' });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });
  
  it('copies the URL when copy button is clicked', async () => {
    render(<QRShare darkMode={false} onClose={mockOnClose} />);
    
    const copyButton = screen.getByRole('button', { name: /Copy Link/i });
    fireEvent.click(copyButton);
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://words-on-phone.netlify.app');
    
    // After clicking, button text should change to "Copied!"
    expect(await screen.findByText('Copied!')).toBeInTheDocument();
  });
  
  it('calls navigator.share when share button is clicked (if available)', () => {
    render(<QRShare darkMode={false} onClose={mockOnClose} />);
    
    // Only test if share button is rendered (since we mocked navigator.share)
    const shareButton = screen.getByRole('button', { name: /Share/i });
    fireEvent.click(shareButton);
    
    expect(navigator.share).toHaveBeenCalledWith({
      title: 'Words on Phone',
      text: 'Check out this fun word game!',
      url: 'https://words-on-phone.netlify.app'
    });
  });
  
  it('applies dark mode styling when darkMode is true', () => {
    render(<QRShare darkMode={true} onClose={mockOnClose} />);
    
    // Get the correct container that has the dark mode class
    const titleElement = screen.getByText('Share Words on Phone');
    const container = titleElement.closest('div')?.parentElement;
    expect(container).not.toBeNull();
    expect(container).toHaveClass('bg-gray-800');
    expect(container).not.toHaveClass('bg-white');
  });
}); 
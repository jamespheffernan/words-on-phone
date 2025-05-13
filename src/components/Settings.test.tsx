import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Settings from './Settings';
import { useGameStore } from '../store/gameStore';
import { previewSound, getAvailableSounds } from '../utils/soundPlayer';

// Mock the Zustand store
vi.mock('../store/gameStore', () => {
  const actual = vi.importActual('../store/gameStore');
  return {
    ...actual,
    useGameStore: vi.fn(),
  };
});

// Mock the haptics functions
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

// Mock sound player
vi.mock('../utils/soundPlayer', () => ({
  previewSound: vi.fn(),
  getAvailableSounds: vi.fn().mockReturnValue(['default', 'buzzer', 'bell', 'horn']),
}));

describe('Settings Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the store implementation
    (useGameStore as any).mockImplementation((selector: any) => 
      selector({
        timerDuration: 60,
        buzzSound: 'default',
        setTimerDuration: vi.fn(),
        setBuzzSound: vi.fn(),
      })
    );
  });

  it('should render the settings component', () => {
    render(<Settings darkMode={false} onToggleDarkMode={() => {}} />);
    expect(screen.getByText(/Timer Duration/i)).toBeInTheDocument();
    expect(screen.getByText(/Buzzer Sound/i)).toBeInTheDocument();
    expect(screen.getByText(/Dark Mode/i)).toBeInTheDocument();
  });

  it('should update timer duration when slider is changed', () => {
    const mockSetTimerDuration = vi.fn();
    (useGameStore as any).mockImplementation((selector: any) => 
      selector({
        timerDuration: 60,
        buzzSound: 'default',
        setTimerDuration: mockSetTimerDuration,
        setBuzzSound: vi.fn(),
      })
    );
    
    render(<Settings darkMode={false} onToggleDarkMode={() => {}} />);
    
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: 45 } });
    
    // Trigger the onMouseUp event to save the timer value
    fireEvent.mouseUp(slider);
    
    expect(mockSetTimerDuration).toHaveBeenCalledWith(45);
  });
  
  it('should update buzzer sound when different sound button is clicked', () => {
    const mockSetBuzzSound = vi.fn();
    (useGameStore as any).mockImplementation((selector: any) => 
      selector({
        timerDuration: 60,
        buzzSound: 'default',
        setTimerDuration: vi.fn(),
        setBuzzSound: mockSetBuzzSound,
      })
    );
    
    render(<Settings darkMode={false} onToggleDarkMode={() => {}} />);
    
    // Find and click the "Bell" button
    const bellButton = screen.getByText('Bell');
    fireEvent.click(bellButton);
    
    expect(mockSetBuzzSound).toHaveBeenCalledWith('bell');
    expect(previewSound).toHaveBeenCalledWith('bell');
  });
  
  it('should call onToggleDarkMode when dark mode switch is clicked', () => {
    const mockToggleDarkMode = vi.fn();
    
    render(<Settings darkMode={false} onToggleDarkMode={mockToggleDarkMode} />);
    
    // Find the dark mode switch button directly
    const darkModeContainer = screen.getByText('Dark Mode').closest('div');
    const darkModeSwitch = darkModeContainer?.querySelector('button');
    expect(darkModeSwitch).not.toBeNull();
    fireEvent.click(darkModeSwitch as Element);
    
    expect(mockToggleDarkMode).toHaveBeenCalledWith(true);
  });

  it('should preview sound when preview button is clicked', () => {
    render(<Settings darkMode={false} onToggleDarkMode={() => {}} />);
    
    // Find and click the preview button
    const previewButton = screen.getByText('Preview Sound');
    fireEvent.click(previewButton);
    
    expect(previewSound).toHaveBeenCalledWith('default');
  });

  it('should reset to defaults when reset button is clicked', () => {
    const mockSetTimerDuration = vi.fn();
    const mockSetBuzzSound = vi.fn();
    
    (useGameStore as any).mockImplementation((selector: any) => 
      selector({
        timerDuration: 75,
        buzzSound: 'bell',
        setTimerDuration: mockSetTimerDuration,
        setBuzzSound: mockSetBuzzSound,
      })
    );
    
    render(<Settings darkMode={false} onToggleDarkMode={() => {}} />);
    
    // Find and click the reset button
    const resetButton = screen.getByText('Reset to Defaults');
    fireEvent.click(resetButton);
    
    expect(mockSetTimerDuration).toHaveBeenCalledWith(60);
    expect(mockSetBuzzSound).toHaveBeenCalledWith('default');
  });
}); 
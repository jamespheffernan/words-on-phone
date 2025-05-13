import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Settings from './Settings';
import { useGameStore } from '../store/gameStore';

// Mock the Zustand store
vi.mock('../store/gameStore', () => {
  const actual = vi.importActual('../store/gameStore');
  return {
    ...actual,
    useGameStore: vi.fn(),
  };
});

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
        getAvailableBuzzSounds: vi.fn().mockReturnValue(['default', 'buzzer', 'bell']),
      })
    );
  });

  it('should render the settings component', () => {
    render(<Settings darkMode={false} onToggleDarkMode={() => {}} />);
    expect(screen.getByText(/Timer Duration/i)).toBeInTheDocument();
    expect(screen.getByText(/Buzzer Sound/i)).toBeInTheDocument();
  });

  it('should update timer duration when slider is changed', () => {
    const mockSetTimerDuration = vi.fn();
    (useGameStore as any).mockImplementation((selector: any) => 
      selector({
        timerDuration: 60,
        buzzSound: 'default',
        setTimerDuration: mockSetTimerDuration,
        setBuzzSound: vi.fn(),
        getAvailableBuzzSounds: vi.fn().mockReturnValue(['default', 'buzzer', 'bell']),
      })
    );
    
    render(<Settings darkMode={false} onToggleDarkMode={() => {}} />);
    
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: 45 } });
    
    expect(mockSetTimerDuration).toHaveBeenCalledWith(45);
  });
  
  it('should update buzzer sound when different option is selected', () => {
    const mockSetBuzzSound = vi.fn();
    (useGameStore as any).mockImplementation((selector: any) => 
      selector({
        timerDuration: 60,
        buzzSound: 'default',
        setTimerDuration: vi.fn(),
        setBuzzSound: mockSetBuzzSound,
        getAvailableBuzzSounds: vi.fn().mockReturnValue(['default', 'buzzer', 'bell']),
      })
    );
    
    render(<Settings darkMode={false} onToggleDarkMode={() => {}} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'bell' } });
    
    expect(mockSetBuzzSound).toHaveBeenCalledWith('bell');
  });
  
  it('should call onToggleDarkMode when dark mode switch is clicked', () => {
    const mockToggleDarkMode = vi.fn();
    
    render(<Settings darkMode={false} onToggleDarkMode={mockToggleDarkMode} />);
    
    const darkModeSwitch = screen.getByRole('checkbox', { name: /dark mode/i });
    fireEvent.click(darkModeSwitch);
    
    expect(mockToggleDarkMode).toHaveBeenCalledWith(true);
  });
}); 
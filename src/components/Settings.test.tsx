import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Settings from './Settings';
import { useGameStore } from '../store/gameStore';

// Mock the zustand store
vi.mock('../store/gameStore', () => {
  const actual = vi.importActual('../store/gameStore');
  return {
    ...actual,
    useGameStore: vi.fn(),
  };
});

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the store implementation
    const mockSetTimerDuration = vi.fn();
    const mockSetBuzzSound = vi.fn();
    
    (useGameStore as any).mockImplementation((selector: any) => 
      selector({
        timerDuration: 60,
        buzzSound: 'default',
        setTimerDuration: mockSetTimerDuration,
        setBuzzSound: mockSetBuzzSound,
      })
    );
  });
  
  it('should render timer duration slider', () => {
    render(<Settings />);
    expect(screen.getByLabelText(/Timer Duration/i)).toBeInTheDocument();
    expect(screen.getByText('60 seconds')).toBeInTheDocument();
  });
  
  it('should call setTimerDuration when slider changes', () => {
    const mockSetTimerDuration = vi.fn();
    (useGameStore as any).mockImplementation((selector: any) => 
      selector({
        timerDuration: 60,
        buzzSound: 'default',
        setTimerDuration: mockSetTimerDuration,
        setBuzzSound: vi.fn(),
      })
    );
    
    render(<Settings />);
    
    const slider = screen.getByLabelText(/Timer Duration/i);
    fireEvent.change(slider, { target: { value: '90' } });
    
    expect(mockSetTimerDuration).toHaveBeenCalledWith(90);
  });
  
  it('should render buzzer sound selector', () => {
    render(<Settings />);
    expect(screen.getByLabelText(/Buzzer Sound/i)).toBeInTheDocument();
  });
  
  it('should call setBuzzSound when buzzer changes', () => {
    const mockSetBuzzSound = vi.fn();
    (useGameStore as any).mockImplementation((selector: any) => 
      selector({
        timerDuration: 60,
        buzzSound: 'default',
        setTimerDuration: vi.fn(),
        setBuzzSound: mockSetBuzzSound,
      })
    );
    
    render(<Settings />);
    
    const select = screen.getByLabelText(/Buzzer Sound/i);
    fireEvent.change(select, { target: { value: 'buzzer2' } });
    
    expect(mockSetBuzzSound).toHaveBeenCalledWith('buzzer2');
  });
}); 
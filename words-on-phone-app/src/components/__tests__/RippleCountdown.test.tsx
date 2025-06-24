import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RippleCountdown } from '../RippleCountdown';

describe('RippleCountdown', () => {
  it('renders with correct structure', () => {
    render(<RippleCountdown remaining={30} total={60} />);
    
    // Check that the main container is rendered
    const container = document.querySelector('.ripple-countdown');
    expect(container).not.toBeNull();
    
    // Always show 4 dots in diamond pattern
    const dots = document.querySelectorAll('.ripple-countdown__dot');
    expect(dots).toHaveLength(4);
    
    // At 50% time remaining (30/60), should show 2 ripples
    const ripples = document.querySelectorAll('.ripple-countdown__ripple');
    expect(ripples).toHaveLength(2);
  });

  it('shows correct number of ripples based on time remaining', () => {
    const { rerender } = render(<RippleCountdown remaining={60} total={60} />);
    
    // At start (100% time remaining), should show 3 ripples
    let ripples = document.querySelectorAll('.ripple-countdown__ripple');
    expect(ripples).toHaveLength(3);
    
    // Always show 4 dots regardless of time
    let dots = document.querySelectorAll('.ripple-countdown__dot');
    expect(dots).toHaveLength(4);
    
    // At 50% time remaining, should show 2 ripples
    rerender(<RippleCountdown remaining={30} total={60} />);
    ripples = document.querySelectorAll('.ripple-countdown__ripple');
    expect(ripples).toHaveLength(2);
    dots = document.querySelectorAll('.ripple-countdown__dot');
    expect(dots).toHaveLength(4);
    
    // At 20% time remaining, should show 1 ripple
    rerender(<RippleCountdown remaining={12} total={60} />);
    ripples = document.querySelectorAll('.ripple-countdown__ripple');
    expect(ripples).toHaveLength(1);
    dots = document.querySelectorAll('.ripple-countdown__dot');
    expect(dots).toHaveLength(4);
    
    // At 0% time remaining, should still show 1 ripple
    rerender(<RippleCountdown remaining={0} total={60} />);
    ripples = document.querySelectorAll('.ripple-countdown__ripple');
    expect(ripples).toHaveLength(1);
    dots = document.querySelectorAll('.ripple-countdown__dot');
    expect(dots).toHaveLength(4);
  });

  it('calculates ripple speed correctly', () => {
    const { rerender } = render(<RippleCountdown remaining={60} total={60} />);
    
    let container = document.querySelector('.ripple-countdown') as HTMLElement;
    // At start (remaining = total), speed should be 2s
    expect(container.style.getPropertyValue('--ripple-speed')).toBe('2s');
    
    // At end (remaining = 0), speed should be 0.5s
    rerender(<RippleCountdown remaining={0} total={60} />);
    container = document.querySelector('.ripple-countdown') as HTMLElement;
    expect(container.style.getPropertyValue('--ripple-speed')).toBe('0.5s');
  });

  it('handles edge cases gracefully', () => {
    // Test with zero total duration - should always show 4 dots
    render(<RippleCountdown remaining={0} total={0} />);
    let dots = document.querySelectorAll('.ripple-countdown__dot');
    expect(dots).toHaveLength(4);
    
    // Should also default to 3 ripples and 2s speed
    let ripples = document.querySelectorAll('.ripple-countdown__ripple');
    expect(ripples).toHaveLength(3);
    
    let container = document.querySelector('.ripple-countdown') as HTMLElement;
    expect(container.style.getPropertyValue('--ripple-speed')).toBe('2s');
  });

  it('has proper accessibility attributes', () => {
    render(<RippleCountdown remaining={30} total={60} />);
    
    const container = document.querySelector('.ripple-countdown');
    expect(container?.getAttribute('aria-hidden')).toBe('true');
  });
}); 
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
    
    // At 50% time remaining (30/60), should show 2 dots
    const dots = document.querySelectorAll('.ripple-countdown__dot');
    expect(dots).toHaveLength(2);
    
    // Check that ripples are rendered
    const ripples = document.querySelectorAll('.ripple-countdown__ripple');
    expect(ripples).toHaveLength(3);
  });

  it('shows correct number of dots based on time remaining', () => {
    const { rerender } = render(<RippleCountdown remaining={60} total={60} />);
    
    // At start (100% time remaining), should show 3 dots
    let dots = document.querySelectorAll('.ripple-countdown__dot');
    expect(dots).toHaveLength(3);
    
    // At 50% time remaining, should show 2 dots
    rerender(<RippleCountdown remaining={30} total={60} />);
    dots = document.querySelectorAll('.ripple-countdown__dot');
    expect(dots).toHaveLength(2);
    
    // At 20% time remaining, should show 1 dot
    rerender(<RippleCountdown remaining={12} total={60} />);
    dots = document.querySelectorAll('.ripple-countdown__dot');
    expect(dots).toHaveLength(1);
    
    // At 0% time remaining, should still show 1 dot
    rerender(<RippleCountdown remaining={0} total={60} />);
    dots = document.querySelectorAll('.ripple-countdown__dot');
    expect(dots).toHaveLength(1);
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
    // Test with zero total duration - should default to 3 dots
    render(<RippleCountdown remaining={0} total={0} />);
    let dots = document.querySelectorAll('.ripple-countdown__dot');
    expect(dots).toHaveLength(3);
    
    let container = document.querySelector('.ripple-countdown') as HTMLElement;
    expect(container.style.getPropertyValue('--ripple-speed')).toBe('2s');
  });

  it('has proper accessibility attributes', () => {
    render(<RippleCountdown remaining={30} total={60} />);
    
    const container = document.querySelector('.ripple-countdown');
    expect(container?.getAttribute('aria-hidden')).toBe('true');
  });
}); 
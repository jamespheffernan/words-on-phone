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
    
    // Check that dots are rendered
    const dots = document.querySelectorAll('.ripple-countdown__dot');
    expect(dots).toHaveLength(4);
    
    // Check that ripples are rendered
    const ripples = document.querySelectorAll('.ripple-countdown__ripple');
    expect(ripples).toHaveLength(3);
  });

  it('calculates intensity correctly', () => {
    const { rerender } = render(<RippleCountdown remaining={60} total={60} />);
    
    let container = document.querySelector('.ripple-countdown') as HTMLElement;
    // At start (remaining = total), intensity should be 0, so dot opacity should be 0.4
    expect(container.style.getPropertyValue('--dot-opacity')).toBe('0.4');
    
    // Halfway through (remaining = total/2), intensity should be 0.5
    rerender(<RippleCountdown remaining={30} total={60} />);
    container = document.querySelector('.ripple-countdown') as HTMLElement;
    expect(container.style.getPropertyValue('--dot-opacity')).toBe('0.65');
    
    // At end (remaining = 0), intensity should be 1, so dot opacity should be 0.9
    rerender(<RippleCountdown remaining={0} total={60} />);
    container = document.querySelector('.ripple-countdown') as HTMLElement;
    expect(container.style.getPropertyValue('--dot-opacity')).toBe('0.9');
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
    // Test with zero total duration
    render(<RippleCountdown remaining={0} total={0} />);
    let container = document.querySelector('.ripple-countdown') as HTMLElement;
    expect(container.style.getPropertyValue('--dot-opacity')).toBe('0.4');
    expect(container.style.getPropertyValue('--ripple-speed')).toBe('2s');
  });

  it('has proper accessibility attributes', () => {
    render(<RippleCountdown remaining={30} total={60} />);
    
    const container = document.querySelector('.ripple-countdown');
    expect(container?.getAttribute('aria-hidden')).toBe('true');
  });
}); 
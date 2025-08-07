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
    
    // Always renders 3 objects but controls visibility via active/inactive classes
    const objects = document.querySelectorAll('.ripple-countdown__object');
    expect(objects).toHaveLength(3);
    
    // At 50% time remaining (30/60), should show 2 active objects
    const activeObjects = document.querySelectorAll('.ripple-countdown__object:not(.ripple-countdown__object--inactive)');
    expect(activeObjects).toHaveLength(2);
    
    // Each object should have 4 dots (3 objects × 4 dots = 12 total)
    const dots = document.querySelectorAll('.ripple-countdown__dot');
    expect(dots).toHaveLength(12);
    
    // Each object should have 3 ripples (3 objects × 3 ripples = 9 total)
    const ripples = document.querySelectorAll('.ripple-countdown__ripple');
    expect(ripples).toHaveLength(9);
  });

  it('shows correct number of objects based on time remaining', () => {
    const { rerender } = render(<RippleCountdown remaining={60} total={60} />);
    
    // Always renders 3 total objects
    let objects = document.querySelectorAll('.ripple-countdown__object');
    expect(objects).toHaveLength(3);
    
    // At start (100% time remaining), should show 3 active objects
    let activeObjects = document.querySelectorAll('.ripple-countdown__object:not(.ripple-countdown__object--inactive)');
    expect(activeObjects).toHaveLength(3);
    let dots = document.querySelectorAll('.ripple-countdown__dot');
    expect(dots).toHaveLength(12); // 3 objects × 4 dots each
    let ripples = document.querySelectorAll('.ripple-countdown__ripple');
    expect(ripples).toHaveLength(9); // 3 objects × 3 ripples each
    
    // At 50% time remaining, should show 2 active objects
    rerender(<RippleCountdown remaining={30} total={60} />);
    objects = document.querySelectorAll('.ripple-countdown__object');
    expect(objects).toHaveLength(3); // Still 3 total objects
    activeObjects = document.querySelectorAll('.ripple-countdown__object:not(.ripple-countdown__object--inactive)');
    expect(activeObjects).toHaveLength(2);
    dots = document.querySelectorAll('.ripple-countdown__dot');
    expect(dots).toHaveLength(12); // Still 3 objects × 4 dots each
    ripples = document.querySelectorAll('.ripple-countdown__ripple');
    expect(ripples).toHaveLength(9); // Still 3 objects × 3 ripples each
    
    // At 20% time remaining, should show 1 active object
    rerender(<RippleCountdown remaining={12} total={60} />);
    objects = document.querySelectorAll('.ripple-countdown__object');
    expect(objects).toHaveLength(3); // Still 3 total objects
    activeObjects = document.querySelectorAll('.ripple-countdown__object:not(.ripple-countdown__object--inactive)');
    expect(activeObjects).toHaveLength(1);
    dots = document.querySelectorAll('.ripple-countdown__dot');
    expect(dots).toHaveLength(12); // Still 3 objects × 4 dots
    ripples = document.querySelectorAll('.ripple-countdown__ripple');
    expect(ripples).toHaveLength(9); // Still 3 objects × 3 ripples
    
    // At 0% time remaining, should still show 1 active object
    rerender(<RippleCountdown remaining={0} total={60} />);
    objects = document.querySelectorAll('.ripple-countdown__object');
    expect(objects).toHaveLength(3); // Still 3 total objects
    activeObjects = document.querySelectorAll('.ripple-countdown__object:not(.ripple-countdown__object--inactive)');
    expect(activeObjects).toHaveLength(1);
    dots = document.querySelectorAll('.ripple-countdown__dot');
    expect(dots).toHaveLength(12);
    ripples = document.querySelectorAll('.ripple-countdown__ripple');
    expect(ripples).toHaveLength(9);
  });

  it('calculates ripple speed correctly', () => {
    const { rerender } = render(<RippleCountdown remaining={60} total={60} />);
    
    let object = document.querySelector('.ripple-countdown__object') as HTMLElement;
    // At start (remaining = total), speed should be 2s
    expect(object.style.getPropertyValue('--ripple-speed')).toBe('2s');
    
    // At end (remaining = 0), speed should be 0.5s
    rerender(<RippleCountdown remaining={0} total={60} />);
    object = document.querySelector('.ripple-countdown__object') as HTMLElement;
    expect(object.style.getPropertyValue('--ripple-speed')).toBe('0.5s');
  });

  it('handles edge cases gracefully', () => {
    // Test with zero total duration - should default to 3 objects
    render(<RippleCountdown remaining={0} total={0} />);
    const objects = document.querySelectorAll('.ripple-countdown__object');
    expect(objects).toHaveLength(3);
    
    // All should be active when total is 0
    const activeObjects = document.querySelectorAll('.ripple-countdown__object:not(.ripple-countdown__object--inactive)');
    expect(activeObjects).toHaveLength(3);
    
    const dots = document.querySelectorAll('.ripple-countdown__dot');
    expect(dots).toHaveLength(12); // 3 objects × 4 dots each
    
    // Should also default to 3 ripples per object and 2s speed
    const ripples = document.querySelectorAll('.ripple-countdown__ripple');
    expect(ripples).toHaveLength(9); // 3 objects × 3 ripples each
    
    const object = document.querySelector('.ripple-countdown__object') as HTMLElement;
    expect(object.style.getPropertyValue('--ripple-speed')).toBe('2s');
  });

  it('has proper accessibility attributes', () => {
    render(<RippleCountdown remaining={30} total={60} />);
    
    const container = document.querySelector('.ripple-countdown');
    expect(container?.getAttribute('aria-hidden')).toBe('true');
  });
}); 
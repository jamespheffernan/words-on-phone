import React, { useMemo } from 'react';
import './RippleCountdown.css';

interface RippleCountdownProps {
  remaining: number;    // seconds remaining
  total: number;        // total timer duration
  variant?: 'default';  // future extensibility
}

export const RippleCountdown: React.FC<RippleCountdownProps> = ({
  remaining,
  total,
  variant = 'default'
}) => {
  // Calculate intensity (0 = start, 1 = almost done)
  const intensity = useMemo(() => {
    if (total <= 0) return 0;
    const progress = Math.max(0, Math.min(1, (total - remaining) / total));
    return progress;
  }, [remaining, total]);

  // Calculate ripple animation speed based on intensity
  const rippleSpeed = useMemo(() => {
    // From 2s at start to 0.5s at end
    const minSpeed = 0.5;
    const maxSpeed = 2.0;
    return maxSpeed - (intensity * (maxSpeed - minSpeed));
  }, [intensity]);

  // Calculate number of visible dots based on time remaining
  const visibleDots = useMemo(() => {
    if (total <= 0) return 3; // Default to 3 dots if no timer
    
    const timePercent = remaining / total;
    
    // 3 dots when > 66% time remaining
    // 2 dots when 33-66% time remaining  
    // 1 dot when < 33% time remaining
    if (timePercent > 0.66) return 3;
    if (timePercent > 0.33) return 2;
    return 1;
  }, [remaining, total]);

  // Calculate dot opacity based on intensity
  const dotOpacity = useMemo(() => {
    // From 0.6 at start to 0.9 at end
    const minOpacity = 0.6;
    const maxOpacity = 0.9;
    return minOpacity + (intensity * (maxOpacity - minOpacity));
  }, [intensity]);

  return (
    <div 
      className={`ripple-countdown ripple-countdown--${variant}`}
      style={{
        '--ripple-speed': `${rippleSpeed}s`,
        '--dot-opacity': dotOpacity,
      } as React.CSSProperties}
      aria-hidden="true"
    >
      {/* Central dots - show only the number based on time remaining */}
      <div className="ripple-countdown__dots">
        {visibleDots >= 1 && <div className="ripple-countdown__dot ripple-countdown__dot--center" />}
        {visibleDots >= 2 && <div className="ripple-countdown__dot ripple-countdown__dot--left" />}
        {visibleDots >= 3 && <div className="ripple-countdown__dot ripple-countdown__dot--right" />}
      </div>

      {/* Ripple layers with staggered animations */}
      <div className="ripple-countdown__ripples">
        <div className="ripple-countdown__ripple ripple-countdown__ripple--1" />
        <div className="ripple-countdown__ripple ripple-countdown__ripple--2" />
        <div className="ripple-countdown__ripple ripple-countdown__ripple--3" />
      </div>
    </div>
  );
}; 
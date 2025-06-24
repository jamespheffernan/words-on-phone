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

  // Calculate tempo speed based on intensity
  const tempoSpeed = useMemo(() => {
    // tempo ranges from 2s (start) -> 1s (end)
    return 2 - intensity; // 2 to 1 seconds
  }, [intensity]);

  // Calculate number of visible countdown objects based on time remaining
  const visibleObjects = useMemo(() => {
    if (total <= 0) return 3; // Default to 3 objects if no timer
    
    const timePercent = remaining / total;
    
    // 3 objects when > 66% time remaining
    // 2 objects when 33-66% time remaining  
    // 1 object when < 33% time remaining
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

  // Create a single countdown object
  const CountdownObject = ({ delay = 0 }: { delay?: number }) => (
    <div 
      className="ripple-countdown__object"
      style={{
        '--ripple-speed': `${rippleSpeed}s`,
        '--dot-opacity': dotOpacity,
        '--animation-delay': `${delay}s`,
        '--tempo': `${tempoSpeed}s`,
      } as React.CSSProperties}
    >
      {/* Central dots in diamond pattern */}
      <div className="ripple-countdown__dots">
        <div className="ripple-countdown__dot ripple-countdown__dot--top" />
        <div className="ripple-countdown__dot ripple-countdown__dot--right" />
        <div className="ripple-countdown__dot ripple-countdown__dot--bottom" />
        <div className="ripple-countdown__dot ripple-countdown__dot--left" />
      </div>

      {/* Ripple layers */}
      <div className="ripple-countdown__ripples">
        <div className="ripple-countdown__ripple ripple-countdown__ripple--1" />
        <div className="ripple-countdown__ripple ripple-countdown__ripple--2" />
        <div className="ripple-countdown__ripple ripple-countdown__ripple--3" />
      </div>
    </div>
  );

  return (
    <div 
      className={`ripple-countdown ripple-countdown--${variant}`}
      aria-hidden="true"
    >
      {/* Show multiple countdown objects based on time remaining */}
      {visibleObjects >= 1 && <CountdownObject delay={0} />}
      {visibleObjects >= 2 && <CountdownObject delay={0.5} />}
      {visibleObjects >= 3 && <CountdownObject delay={1} />}
    </div>
  );
}; 
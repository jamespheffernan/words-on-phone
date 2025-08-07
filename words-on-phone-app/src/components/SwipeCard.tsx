import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useHaptics } from '../hooks/useHaptics';
import './SwipeCard.css';

interface SwipeCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  disabled?: boolean;
  className?: string;
}

interface TouchState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
}

const SWIPE_THRESHOLD = 80; // Minimum distance to trigger swipe
const SWIPE_VELOCITY_THRESHOLD = 0.3; // Minimum velocity to trigger swipe
const MAX_ROTATION = 15; // Maximum rotation in degrees

export const SwipeCard: React.FC<SwipeCardProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
  className = ''
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [touchState, setTouchState] = useState<TouchState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isDragging: false
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const { triggerImpact, triggerHaptic } = useHaptics();

  const resetCard = useCallback(() => {
    if (!cardRef.current) return;
    
    cardRef.current.style.transform = 'translateX(0) translateY(0) rotate(0deg)';
    cardRef.current.style.opacity = '1';
    setTouchState({
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      isDragging: false
    });
  }, []);

  const animateSwipe = useCallback((direction: 'left' | 'right', callback?: () => void) => {
    if (!cardRef.current) return;
    
    setIsAnimating(true);
    const card = cardRef.current;
    const distance = direction === 'left' ? -window.innerWidth : window.innerWidth;
    const rotation = direction === 'left' ? -MAX_ROTATION : MAX_ROTATION;
    
    card.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
    card.style.transform = `translateX(${distance}px) rotate(${rotation}deg)`;
    card.style.opacity = '0';
    
    setTimeout(() => {
      resetCard();
      card.style.transition = '';
      setIsAnimating(false);
      callback?.();
    }, 300);
  }, [resetCard]);

  const updateCardTransform = useCallback((deltaX: number, deltaY: number) => {
    if (!cardRef.current) return;
    
    const card = cardRef.current;
    const rotation = (deltaX / window.innerWidth) * MAX_ROTATION;
    const opacity = Math.max(0.6, 1 - Math.abs(deltaX) / (window.innerWidth * 0.6));
    
    card.style.transform = `translateX(${deltaX}px) translateY(${deltaY}px) rotate(${rotation}deg)`;
    card.style.opacity = opacity.toString();
  }, []);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (disabled || isAnimating) return;
    
    setTouchState({
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
      isDragging: true
    });
    
    if (cardRef.current) {
      cardRef.current.style.transition = 'none';
    }
  }, [disabled, isAnimating]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!touchState.isDragging || disabled || isAnimating) return;
    
    const deltaX = clientX - touchState.startX;
    const deltaY = clientY - touchState.startY;
    
    setTouchState(prev => ({
      ...prev,
      currentX: clientX,
      currentY: clientY
    }));
    
    updateCardTransform(deltaX, deltaY);
    
    // Provide haptic feedback at swipe threshold
    if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) < SWIPE_THRESHOLD + 10) {
      triggerHaptic('ui', 'button-press');
    }
  }, [touchState.isDragging, touchState.startX, touchState.startY, disabled, isAnimating, updateCardTransform, triggerHaptic]);

  const handleEnd = useCallback(() => {
    if (!touchState.isDragging || disabled || isAnimating) return;
    
    const deltaX = touchState.currentX - touchState.startX;
    const distance = Math.abs(deltaX);
    const velocity = Math.abs(deltaX) / 100; // Simplified velocity calculation
    
    setTouchState(prev => ({ ...prev, isDragging: false }));
    
    if (cardRef.current) {
      cardRef.current.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
    }
    
    // Determine if swipe should trigger action
    const shouldSwipe = distance > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY_THRESHOLD;
    
    if (shouldSwipe) {
      if (deltaX > 0) {
        // Right swipe - correct
        triggerImpact();
        animateSwipe('right', onSwipeRight);
      } else {
        // Left swipe - skip
        triggerImpact();
        animateSwipe('left', onSwipeLeft);
      }
    } else {
      // Snap back to center
      setTimeout(() => {
        resetCard();
        if (cardRef.current) {
          cardRef.current.style.transition = '';
        }
      }, 300);
    }
  }, [touchState.isDragging, touchState.currentX, touchState.startX, disabled, isAnimating, triggerImpact, animateSwipe, onSwipeRight, onSwipeLeft, resetCard]);

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  // Mouse events (for desktop) - memoized to prevent infinite re-renders
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  }, [handleStart]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Add/remove mouse event listeners
  useEffect(() => {
    if (touchState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [touchState.isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={cardRef}
      className={`swipe-card ${disabled ? 'disabled' : ''} ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      style={{
        touchAction: 'none',
        userSelect: 'none',
        cursor: disabled ? 'default' : 'grab'
      }}
    >
      {children}
      
      {/* Visual feedback indicators */}
      {touchState.isDragging && (
        <>
          <div 
            className="swipe-indicator swipe-indicator-left"
            style={{
              opacity: Math.min(1, Math.max(0, -(touchState.currentX - touchState.startX) / SWIPE_THRESHOLD))
            }}
          >
            <span className="swipe-icon">⏭️</span>
            <span className="swipe-text">SKIP</span>
          </div>
          <div 
            className="swipe-indicator swipe-indicator-right"
            style={{
              opacity: Math.min(1, Math.max(0, (touchState.currentX - touchState.startX) / SWIPE_THRESHOLD))
            }}
          >
            <span className="swipe-icon">✓</span>
            <span className="swipe-text">CORRECT</span>
          </div>
        </>
      )}
    </div>
  );
};
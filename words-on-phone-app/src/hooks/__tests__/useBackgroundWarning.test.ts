import { renderHook } from '@testing-library/react';
import { useBackgroundWarning, useBackgroundWarningCSS } from '../useBackgroundWarning';

describe('useBackgroundWarning', () => {
  describe('useBackgroundWarning', () => {
    it('should return normal background when above warning threshold', () => {
      const { result } = renderHook(() => 
        useBackgroundWarning({
          timeRemaining: 60,
          totalDuration: 60,
          enabled: true
        })
      );

      expect(result.current.isWarning).toBe(false);
      expect(result.current.warningIntensity).toBe(1);
      expect(result.current.backgroundStyle).toContain('rgb(102, 126, 234)'); // Normal purple
    });

    it('should return warning background when below threshold', () => {
      const { result } = renderHook(() => 
        useBackgroundWarning({
          timeRemaining: 15,
          totalDuration: 60,
          enabled: true
        })
      );

      expect(result.current.isWarning).toBe(true);
      expect(result.current.warningIntensity).toBe(0.5); // 15/60 = 0.25, which is 0.5 of the 0.5 threshold
      expect(result.current.backgroundStyle).toContain('linear-gradient');
    });

    it('should return critical background at zero time', () => {
      const { result } = renderHook(() => 
        useBackgroundWarning({
          timeRemaining: 0,
          totalDuration: 60,
          enabled: true
        })
      );

      expect(result.current.isWarning).toBe(true);
      expect(result.current.warningIntensity).toBe(0);
      expect(result.current.backgroundStyle).toContain('rgb(255, 107, 107)'); // Red critical
    });

    it('should return normal background when disabled', () => {
      const { result } = renderHook(() => 
        useBackgroundWarning({
          timeRemaining: 0,
          totalDuration: 60,
          enabled: false
        })
      );

      expect(result.current.isWarning).toBe(false);
      expect(result.current.warningIntensity).toBe(1);
      expect(result.current.backgroundStyle).toBe('linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
    });

    it('should handle custom warning thresholds', () => {
      const { result } = renderHook(() => 
        useBackgroundWarning({
          timeRemaining: 45,
          totalDuration: 60,
          enabled: true,
          customThreshold: 0.8 // 80% threshold instead of 50%
        })
      );

      // 45/60 = 0.75, which is below 0.8 threshold
      expect(result.current.isWarning).toBe(true);
      expect(result.current.warningIntensity).toBeCloseTo(0.9375); // (0.75 / 0.8)
    });

    it('should handle zero duration gracefully', () => {
      const { result } = renderHook(() => 
        useBackgroundWarning({
          timeRemaining: 10,
          totalDuration: 0,
          enabled: true
        })
      );

      expect(result.current.isWarning).toBe(false);
      expect(result.current.warningIntensity).toBe(1);
      expect(result.current.backgroundStyle).toBe('linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
    });

    it('should update correctly when time changes', () => {
      const { result, rerender } = renderHook(
        ({ timeRemaining }) => useBackgroundWarning({
          timeRemaining,
          totalDuration: 60,
          enabled: true
        }),
        { initialProps: { timeRemaining: 60 } }
      );

      // Initially normal
      expect(result.current.isWarning).toBe(false);

      // Rerender with warning time
      rerender({ timeRemaining: 20 });
      expect(result.current.isWarning).toBe(true);

      // Rerender with critical time
      rerender({ timeRemaining: 5 });
      expect(result.current.isWarning).toBe(true);
      expect(result.current.warningIntensity).toBeCloseTo(0.167); // 5/60 = 0.083, 0.083/0.5 = 0.167
    });

    it('should maintain referential stability when values don\'t change', () => {
      const { result, rerender } = renderHook(
        () => useBackgroundWarning({
          timeRemaining: 30,
          totalDuration: 60,
          enabled: true
        })
      );

      const firstResult = result.current;
      rerender();
      const secondResult = result.current;

      expect(firstResult).toBe(secondResult); // Same object reference due to useMemo
    });
  });

  describe('useBackgroundWarningCSS', () => {
    it('should return CSS custom properties', () => {
      const { result } = renderHook(() => 
        useBackgroundWarningCSS({
          timeRemaining: 30,
          totalDuration: 60,
          enabled: true
        })
      );

      expect(result.current).toHaveProperty('--warning-primary-color');
      expect(result.current).toHaveProperty('--warning-secondary-color');
      expect(result.current).toHaveProperty('--warning-intensity');
      expect(result.current).toHaveProperty('--warning-transition-duration');
      expect(result.current).toHaveProperty('--warning-transition-easing');
    });

    it('should have correct CSS property formats', () => {
      const { result } = renderHook(() => 
        useBackgroundWarningCSS({
          timeRemaining: 15,
          totalDuration: 60,
          enabled: true
        })
      );

      expect(result.current['--warning-primary-color']).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
      expect(result.current['--warning-secondary-color']).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
      expect(result.current['--warning-intensity']).toMatch(/^\d+(\.\d+)?$/);
      expect(result.current['--warning-transition-duration']).toBe('0.3s');
      expect(result.current['--warning-transition-easing']).toBe('ease-in-out');
    });

    it('should update CSS properties when warning state changes', () => {
      const { result, rerender } = renderHook(
        ({ timeRemaining }) => useBackgroundWarningCSS({
          timeRemaining,
          totalDuration: 60,
          enabled: true
        }),
        { initialProps: { timeRemaining: 60 } }
      );

      const normalIntensity = result.current['--warning-intensity'];
      
      rerender({ timeRemaining: 0 });
      const criticalIntensity = result.current['--warning-intensity'];

      expect(normalIntensity).toBe('1');
      expect(criticalIntensity).toBe('0');
    });
  });
}); 
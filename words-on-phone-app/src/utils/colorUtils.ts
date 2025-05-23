/**
 * Color utilities for visual warning system
 * Handles smooth color interpolation for progressive background warnings
 */

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface ColorStop {
  position: number; // 0-1, where 0 is start and 1 is end
  color: RGBColor;
}

/**
 * Color progression stages for background warning
 * Normal (100% time) → Orange (50% time) → Red (0% time)
 */
export const WARNING_COLOR_STOPS: ColorStop[] = [
  // Normal state - purple gradient colors
  { position: 1.0, color: { r: 102, g: 126, b: 234 } }, // #667eea
  { position: 0.5, color: { r: 255, g: 159, b: 64 } },  // Orange warning #ff9f40
  { position: 0.0, color: { r: 255, g: 107, b: 107 } }  // Red critical #ff6b6b
];

/**
 * Secondary gradient colors for smooth transitions
 */
export const WARNING_COLOR_STOPS_SECONDARY: ColorStop[] = [
  // Normal state - purple gradient colors  
  { position: 1.0, color: { r: 118, g: 75, b: 162 } },  // #764ba2
  { position: 0.5, color: { r: 255, g: 140, b: 105 } }, // Orange warning secondary #ff8c69
  { position: 0.0, color: { r: 255, g: 142, b: 142 } }  // Red critical secondary #ff8e8e
];

/**
 * Configuration for warning system
 */
export const WARNING_CONFIG = {
  // When warning begins (as percentage of total time remaining)
  // 0.5 = warning starts at 50% time remaining
  WARNING_THRESHOLD: 0.5,
  
  // Transition timing
  TRANSITION_DURATION: '0.3s',
  TRANSITION_EASING: 'ease-in-out',
  
  // Accessibility - reduced motion
  REDUCED_MOTION_DURATION: '0s'
} as const;

/**
 * Linear interpolation between two numbers
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Interpolate between two RGB colors
 */
export function lerpColor(colorA: RGBColor, colorB: RGBColor, t: number): RGBColor {
  return {
    r: Math.round(lerp(colorA.r, colorB.r, t)),
    g: Math.round(lerp(colorA.g, colorB.g, t)),
    b: Math.round(lerp(colorA.b, colorB.b, t))
  };
}

/**
 * Convert RGB color to CSS rgb string
 */
export function rgbToCss(color: RGBColor): string {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

/**
 * Calculate warning intensity based on time remaining
 * @param timeRemaining - seconds remaining
 * @param totalDuration - total timer duration in seconds
 * @returns number between 0 (critical) and 1 (normal)
 */
export function calculateWarningIntensity(timeRemaining: number, totalDuration: number): number {
  if (totalDuration <= 0) return 1; // No warning if no duration
  
  const timeProgress = timeRemaining / totalDuration;
  
  // Only show warning when below threshold
  if (timeProgress > WARNING_CONFIG.WARNING_THRESHOLD) {
    return 1; // Normal state
  }
  
  // Map from threshold to 0, so warning progresses as time runs out
  const warningRange = WARNING_CONFIG.WARNING_THRESHOLD;
  const warningProgress = timeProgress / warningRange;
  
  return clamp(warningProgress, 0, 1);
}

/**
 * Find the appropriate color stops for interpolation based on intensity
 */
export function findColorStops(intensity: number, colorStops: ColorStop[]): {
  stopA: ColorStop;
  stopB: ColorStop;
  localT: number;
} {
  // Handle exact boundary matches first
  const exactMatch = colorStops.find(stop => stop.position === intensity);
  if (exactMatch) {
    return { stopA: exactMatch, stopB: exactMatch, localT: 0 };
  }
  
  // Find the two color stops to interpolate between
  for (let i = 0; i < colorStops.length - 1; i++) {
    const stopA = colorStops[i];
    const stopB = colorStops[i + 1];
    
    if (intensity >= stopB.position && intensity <= stopA.position) {
      // Calculate local interpolation value between these two stops
      const range = stopA.position - stopB.position;
      const localT = range > 0 ? (intensity - stopB.position) / range : 0;
      
      return { stopA, stopB, localT };
    }
  }
  
  // Fallback to first/last stops
  if (intensity > colorStops[0].position) {
    return { stopA: colorStops[0], stopB: colorStops[0], localT: 0 };
  } else {
    const lastIndex = colorStops.length - 1;
    return { stopA: colorStops[lastIndex], stopB: colorStops[lastIndex], localT: 0 };
  }
}

/**
 * Calculate warning background colors based on time remaining
 */
export function calculateWarningBackground(timeRemaining: number, totalDuration: number): {
  primaryColor: string;
  secondaryColor: string;
  cssBackground: string;
} {
  const intensity = calculateWarningIntensity(timeRemaining, totalDuration);
  
  // Get interpolated colors
  const primaryStops = findColorStops(intensity, WARNING_COLOR_STOPS);
  const secondaryStops = findColorStops(intensity, WARNING_COLOR_STOPS_SECONDARY);
  
  const primaryColor = lerpColor(primaryStops.stopB.color, primaryStops.stopA.color, primaryStops.localT);
  const secondaryColor = lerpColor(secondaryStops.stopB.color, secondaryStops.stopA.color, secondaryStops.localT);
  
  const primaryCss = rgbToCss(primaryColor);
  const secondaryCss = rgbToCss(secondaryColor);
  
  // Create CSS gradient that matches the existing GameScreen style
  const cssBackground = `linear-gradient(135deg, ${primaryCss} 0%, ${secondaryCss} 100%)`;
  
  return {
    primaryColor: primaryCss,
    secondaryColor: secondaryCss,
    cssBackground
  };
} 
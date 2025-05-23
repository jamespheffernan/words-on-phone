import {
  lerp,
  clamp,
  lerpColor,
  rgbToCss,
  calculateWarningIntensity,
  findColorStops,
  calculateWarningBackground,
  WARNING_COLOR_STOPS,
  type RGBColor,
  type ColorStop
} from '../colorUtils';

describe('colorUtils', () => {
  describe('lerp', () => {
    it('should interpolate between two numbers', () => {
      expect(lerp(0, 10, 0)).toBe(0);
      expect(lerp(0, 10, 1)).toBe(10);
      expect(lerp(0, 10, 0.5)).toBe(5);
      expect(lerp(100, 200, 0.25)).toBe(125);
    });
  });

  describe('clamp', () => {
    it('should clamp values within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('lerpColor', () => {
    it('should interpolate between two RGB colors', () => {
      const colorA: RGBColor = { r: 0, g: 0, b: 0 };
      const colorB: RGBColor = { r: 255, g: 255, b: 255 };
      
      const result = lerpColor(colorA, colorB, 0.5);
      expect(result).toEqual({ r: 128, g: 128, b: 128 });
    });

    it('should return exact colors at extremes', () => {
      const colorA: RGBColor = { r: 100, g: 150, b: 200 };
      const colorB: RGBColor = { r: 255, g: 100, b: 50 };
      
      expect(lerpColor(colorA, colorB, 0)).toEqual(colorA);
      expect(lerpColor(colorA, colorB, 1)).toEqual(colorB);
    });
  });

  describe('rgbToCss', () => {
    it('should convert RGB to CSS string', () => {
      expect(rgbToCss({ r: 255, g: 128, b: 64 })).toBe('rgb(255, 128, 64)');
      expect(rgbToCss({ r: 0, g: 0, b: 0 })).toBe('rgb(0, 0, 0)');
    });
  });

  describe('calculateWarningIntensity', () => {
    it('should return 1 (normal) when time is above threshold', () => {
      // 60 seconds remaining out of 60 total = 100% time
      expect(calculateWarningIntensity(60, 60)).toBe(1);
      
      // 40 seconds remaining out of 60 total = ~67% time (above 50% threshold)
      expect(calculateWarningIntensity(40, 60)).toBe(1);
    });

    it('should return warning intensity when time is below threshold', () => {
      // 30 seconds remaining out of 60 total = 50% time (at threshold)
      expect(calculateWarningIntensity(30, 60)).toBe(1);
      
      // 15 seconds remaining out of 60 total = 25% time (half of threshold)
      expect(calculateWarningIntensity(15, 60)).toBe(0.5);
      
      // 0 seconds remaining = 0% time (critical)
      expect(calculateWarningIntensity(0, 60)).toBe(0);
    });

    it('should handle edge cases', () => {
      expect(calculateWarningIntensity(10, 0)).toBe(1); // No duration
      expect(calculateWarningIntensity(-5, 60)).toBe(0); // Negative time
    });
  });

  describe('findColorStops', () => {
    const testStops: ColorStop[] = [
      { position: 1.0, color: { r: 0, g: 0, b: 255 } },   // Blue at 100%
      { position: 0.5, color: { r: 255, g: 255, b: 0 } }, // Yellow at 50%
      { position: 0.0, color: { r: 255, g: 0, b: 0 } }    // Red at 0%
    ];

    it('should find correct color stops for interpolation', () => {
      const result = findColorStops(0.75, testStops);
      expect(result.stopA.position).toBe(1.0);
      expect(result.stopB.position).toBe(0.5);
      expect(result.localT).toBe(0.5); // 75% is halfway between 50% and 100%
    });

    it('should handle boundary values', () => {
      const resultTop = findColorStops(1.0, testStops);
      expect(resultTop.stopA.position).toBe(1.0);
      expect(resultTop.localT).toBe(0);

      const resultBottom = findColorStops(0.0, testStops);
      expect(resultBottom.stopB.position).toBe(0.0);
      expect(resultBottom.localT).toBe(0);
    });
  });

  describe('calculateWarningBackground', () => {
    it('should return normal colors when time is above threshold', () => {
      const result = calculateWarningBackground(60, 60); // 100% time
      
      expect(result.cssBackground).toContain('rgb(102, 126, 234)'); // Normal purple
      expect(result.cssBackground).toContain('linear-gradient');
    });

    it('should return warning colors when time is below threshold', () => {
      const result = calculateWarningBackground(0, 60); // 0% time - critical
      
      expect(result.cssBackground).toContain('rgb(255, 107, 107)'); // Red critical
      expect(result.cssBackground).toContain('linear-gradient');
    });

    it('should return intermediate colors during warning phase', () => {
      const result = calculateWarningBackground(15, 60); // 25% time - in warning zone
      
      // Should contain interpolated colors between orange and red
      expect(result.cssBackground).toContain('linear-gradient');
      expect(result.primaryColor).toMatch(/rgb\(\d+, \d+, \d+\)/);
      expect(result.secondaryColor).toMatch(/rgb\(\d+, \d+, \d+\)/);
    });

    it('should create proper CSS gradient format', () => {
      const result = calculateWarningBackground(30, 60);
      
      expect(result.cssBackground).toMatch(/^linear-gradient\(135deg, rgb\(\d+, \d+, \d+\) 0%, rgb\(\d+, \d+, \d+\) 100%\)$/);
    });
  });

  describe('color progression validation', () => {
    it('should have valid color stop positions', () => {
      WARNING_COLOR_STOPS.forEach((stop, index) => {
        expect(stop.position).toBeGreaterThanOrEqual(0);
        expect(stop.position).toBeLessThanOrEqual(1);
        
        if (index > 0) {
          // Positions should be in descending order
          expect(stop.position).toBeLessThanOrEqual(WARNING_COLOR_STOPS[index - 1].position);
        }
      });
    });

    it('should have valid RGB values', () => {
      WARNING_COLOR_STOPS.forEach(stop => {
        expect(stop.color.r).toBeGreaterThanOrEqual(0);
        expect(stop.color.r).toBeLessThanOrEqual(255);
        expect(stop.color.g).toBeGreaterThanOrEqual(0);
        expect(stop.color.g).toBeLessThanOrEqual(255);
        expect(stop.color.b).toBeGreaterThanOrEqual(0);
        expect(stop.color.b).toBeLessThanOrEqual(255);
      });
    });
  });
}); 
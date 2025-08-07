import { useEffect, useRef, useCallback } from 'react';

interface UseAutoFontSizeOptions {
  text: string;
  maxFontSize?: number;
  minFontSize?: number;
  maxLines?: number;
}

export const useAutoFontSize = <T extends HTMLElement = HTMLElement>({
  text,
  maxFontSize = 120,
  minFontSize = 16,
  maxLines = 4
}: UseAutoFontSizeOptions) => {
  const elementRef = useRef<T | null>(null);

  const adjustFontSize = useCallback(() => {
    const element = elementRef.current;
    if (!element || !text) return;

    const parentContainer = element.parentElement;
    if (!parentContainer) return;

    // Get the available dimensions (subtract padding if any)
    const containerStyles = window.getComputedStyle(parentContainer);
    const containerWidth = parentContainer.clientWidth - 
      parseFloat(containerStyles.paddingLeft) - 
      parseFloat(containerStyles.paddingRight);
    const containerHeight = parentContainer.clientHeight - 
      parseFloat(containerStyles.paddingTop) - 
      parseFloat(containerStyles.paddingBottom);

    // Enable word wrapping but keep full words together
    element.style.whiteSpace = 'normal';
    element.style.wordBreak = 'normal';
    element.style.overflowWrap = 'normal';

    // Binary search for optimal font size
    let low = minFontSize;
    let high = maxFontSize;
    let bestFit = minFontSize;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      element.style.fontSize = `${mid}px`;
      element.style.lineHeight = '1.2'; // Tight line height for better space usage
      
      // Force reflow to get accurate measurements
      element.offsetHeight;
      
      // Check if content fits within both width and height constraints
      const fitsWidth = element.scrollWidth <= containerWidth;
      const fitsHeight = element.scrollHeight <= containerHeight;
      
      // Count actual lines by measuring line height
      const computedStyle = window.getComputedStyle(element);
      const lineHeight = parseFloat(computedStyle.lineHeight) || mid * 1.2;
      const estimatedLines = Math.ceil(element.scrollHeight / lineHeight);
      const fitsLineCount = estimatedLines <= maxLines;
      
      if (fitsWidth && fitsHeight && fitsLineCount) {
        bestFit = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    element.style.fontSize = `${bestFit}px`;
  }, [text, maxFontSize, minFontSize, maxLines]);

  useEffect(() => {
    adjustFontSize();
  }, [adjustFontSize]);

  // Re-adjust on window resize
  useEffect(() => {
    const handleResize = () => {
      setTimeout(adjustFontSize, 100); // Debounce resize
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [adjustFontSize]);

  return elementRef;
};
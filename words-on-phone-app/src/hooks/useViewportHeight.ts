import { useEffect, useState } from 'react';

/**
 * Hook to manage viewport height with fallback for browsers that don't support dvh
 * Provides dynamic viewport height calculation for mobile browsers
 */
export const useViewportHeight = () => {
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [supportsDvh, setSupportsDvh] = useState<boolean | null>(null);

  useEffect(() => {
    // Feature detection for dvh support
    const checkDvhSupport = () => {
      try {
        // Create a test element to check if dvh is supported
        const testElement = document.createElement('div');
        testElement.style.height = '100dvh';
        document.body.appendChild(testElement);
        
        const computedHeight = window.getComputedStyle(testElement).height;
        const supportsIt = computedHeight !== '' && computedHeight !== '0px';
        
        document.body.removeChild(testElement);
        return supportsIt;
      } catch {
        return false;
      }
    };

    const dvhSupported = checkDvhSupport();
    setSupportsDvh(dvhSupported);

    if (!dvhSupported) {
      // Fallback: Use JavaScript to calculate viewport height
      const updateViewportHeight = () => {
        setViewportHeight(window.innerHeight);
      };

      // Initial calculation
      updateViewportHeight();

      // Update on resize and orientation change
      window.addEventListener('resize', updateViewportHeight);
      window.addEventListener('orientationchange', () => {
        // Delay to account for browser chrome changes
        setTimeout(updateViewportHeight, 100);
      });

      // Visual viewport API support for better mobile handling
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', updateViewportHeight);
      }

      return () => {
        window.removeEventListener('resize', updateViewportHeight);
        window.removeEventListener('orientationchange', updateViewportHeight);
        if (window.visualViewport) {
          window.visualViewport.removeEventListener('resize', updateViewportHeight);
        }
      };
    }
  }, []);

  return {
    viewportHeight,
    supportsDvh,
    // CSS custom property value for use in inline styles
    heightValue: supportsDvh ? '100dvh' : viewportHeight ? `${viewportHeight}px` : '100vh'
  };
}; 
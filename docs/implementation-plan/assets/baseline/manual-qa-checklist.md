# Manual QA Checklist - Mobile Viewport Optimization

## Testing Devices/Viewports

### Portrait Mode Testing

#### iPhone SE (375×667)
- [ ] No vertical scrolling required
- [ ] All elements (header, phrase, buttons) visible
- [ ] Buttons maintain 44px minimum touch target
- [ ] Text scales appropriately with clamp()
- [ ] Safe area insets respected (if applicable)

#### iPhone 14 Pro (393×852)
- [ ] No vertical scrolling required
- [ ] Dynamic viewport height works correctly
- [ ] Safe area insets for notch/home indicator
- [ ] Timer circle scales properly
- [ ] Action buttons fully visible

#### iPhone 14 Pro Max (430×932)
- [ ] No vertical scrolling required
- [ ] Layout utilizes extra space efficiently
- [ ] All responsive elements scale correctly
- [ ] No excessive white space

#### Pixel 5 (393×851)
- [ ] No vertical scrolling in Chrome
- [ ] Address bar behavior handled correctly
- [ ] All elements remain accessible
- [ ] Layout stable during interactions

#### Galaxy S21 (384×854)
- [ ] No vertical scrolling in Samsung Browser
- [ ] Bottom navigation bar considerations
- [ ] All touch targets accessible
- [ ] Performance remains smooth

### Landscape Mode Testing

#### iPhone SE Landscape (667×375)
- [ ] No vertical scrolling in short landscape
- [ ] Reduced padding applied correctly
- [ ] Phrase text size adjusted appropriately
- [ ] All elements still accessible

#### iPhone 14 Pro Landscape (852×393)
- [ ] Horizontal button layout activated (if height >= 500px)
- [ ] Buttons maintain proper spacing
- [ ] No content clipping
- [ ] Landscape-specific optimizations applied

#### Pixel 5 Landscape (851×393)
- [ ] Layout adapts to landscape orientation
- [ ] No scrolling required
- [ ] All functionality preserved
- [ ] Performance maintained

## Functional Testing

### Layout Integrity
- [ ] Header always visible at top
- [ ] Phrase container flexes appropriately
- [ ] Action buttons always accessible at bottom
- [ ] No content overflow or clipping
- [ ] Proper spacing maintained

### Long Phrase Handling
- [ ] Very long phrases wrap correctly
- [ ] Text remains readable
- [ ] No layout breaking
- [ ] Scroll within phrase container if needed (rare)
- [ ] Buttons remain accessible

### Interaction Testing
- [ ] Correct button works on all viewports
- [ ] Pass button works on all viewports
- [ ] Pause button accessible and functional
- [ ] Timer display (when enabled) always visible
- [ ] Score counter always visible
- [ ] Skip counter (when applicable) always visible

### Browser Compatibility
- [ ] Safari iOS 15+ (dvh fallback)
- [ ] Safari iOS 16+ (native dvh support)
- [ ] Chrome Android 96+ (dvh fallback)
- [ ] Chrome Android 108+ (native dvh support)
- [ ] Firefox Mobile (fallback behavior)
- [ ] Samsung Internet (safe area handling)

### PWA Mode Testing
- [ ] Standalone mode (no browser chrome)
- [ ] Full viewport utilization
- [ ] Safe area insets properly applied
- [ ] No layout shifts during loading
- [ ] Proper splash screen behavior

## Performance Verification

### Lighthouse Mobile Audit
- [ ] Performance: 70+ (target: maintain current 78)
- [ ] Accessibility: 95+ (maintain current 95)
- [ ] Best Practices: 95+ (maintain current 96)
- [ ] SEO: 90+ (maintain current 90)
- [ ] No new layout shift warnings
- [ ] No new accessibility violations

### Core Web Vitals
- [ ] Largest Contentful Paint (LCP) < 2.5s
- [ ] First Input Delay (FID) < 100ms
- [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] No regression from baseline measurements

## Edge Cases

### Extreme Viewports
- [ ] Very narrow screens (320px width)
- [ ] Very short screens (480px height)
- [ ] Unusual aspect ratios
- [ ] Zoom levels (150%, 200%)

### Dynamic Content
- [ ] Category switching maintains layout
- [ ] Settings panel doesn't break layout
- [ ] Modal overlays work correctly
- [ ] Timer state changes don't cause shifts

### Orientation Changes
- [ ] Smooth transition between orientations
- [ ] Layout adapts without breaking
- [ ] No content loss during rotation
- [ ] Proper timing for layout recalculation

## Accessibility Verification

### Screen Reader Testing
- [ ] All elements properly announced
- [ ] Navigation order logical
- [ ] Focus management works correctly
- [ ] ARIA labels appropriate

### Touch Targets
- [ ] All buttons meet 44px minimum
- [ ] Adequate spacing between targets
- [ ] No accidental activations
- [ ] Proper feedback on interaction

### Color Contrast
- [ ] Text readable on all backgrounds
- [ ] Warning system maintains contrast
- [ ] Focus indicators visible
- [ ] No accessibility regressions

## Sign-off

- [ ] All portrait viewports tested and passing
- [ ] All landscape viewports tested and passing
- [ ] Functional tests completed successfully
- [ ] Performance metrics maintained or improved
- [ ] Accessibility standards met
- [ ] Edge cases handled appropriately
- [ ] Ready for production deployment

**Tested by:** _[Name]_  
**Date:** _[Date]_  
**Browser versions:** _[List browsers and versions tested]_  
**Device/Simulator:** _[Physical devices or browser dev tools]_ 
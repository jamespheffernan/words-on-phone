# Mobile Layout Baseline Analysis

## Current Issues Identified

### 1. Viewport Height Problems
- **Issue**: `.game-screen` uses `height: 100vh` which doesn't account for mobile browser chrome
- **Impact**: On mobile browsers, the address bar and tab bar reduce available space, causing content to overflow
- **Affected Elements**: Bottom action buttons may be hidden behind browser UI

### 2. Fixed Padding Issues
- **Issue**: Fixed `padding: 20px` on `.game-screen` and `padding: 40px 20px` on `.phrase-container`
- **Impact**: On very small screens (iPhone SE), fixed padding takes up too much space
- **Solution Needed**: Responsive padding using `clamp()`

### 3. Safe Area Inset Missing
- **Issue**: No consideration for notch/home indicator on modern devices
- **Impact**: Content may be clipped on iPhone X+ devices
- **Solution Needed**: `env(safe-area-inset-*)` support

### 4. Layout Structure Issues
- **Issue**: Flex layout with `flex: 1` on phrase container but no explicit height constraints
- **Impact**: Long phrases can push action buttons out of viewport
- **Current Structure**:
  ```
  .game-screen (height: 100vh, flex column)
  ├── .game-header (auto height)
  ├── .phrase-container (flex: 1) 
  └── .game-actions (auto height)
  ```

### 5. Mobile Media Query Limitations
- **Issue**: Only basic responsive adjustments for `max-width: 768px`
- **Missing**: Orientation-specific styles, safe-area handling, dynamic viewport units

## Target Device Testing Matrix

| Device | Viewport | Browser | Current Issues |
|--------|----------|---------|----------------|
| iPhone SE | 375×667 | Safari | Fixed padding too large |
| iPhone 14 Pro | 393×852 | Safari | Safe area insets needed |
| iPhone 14 Pro Max | 430×932 | Safari | Landscape layout issues |
| Pixel 5 | 393×851 | Chrome | Address bar overlap |
| Galaxy S21 | 384×854 | Chrome | Bottom nav interference |

## Baseline Measurements

### Current CSS Values
- Container height: `100vh`
- Screen padding: `20px` (mobile: `15px`)
- Phrase padding: `40px 20px` (mobile: unchanged)
- Button padding: `20px 40px` (mobile: `18px 30px`)
- Header margin: `20px`
- Actions gap: `20px`

### Calculated Heights (iPhone 14 Pro)
- Total viewport: 852px
- Browser chrome: ~100px (variable)
- Available space: ~752px
- Current layout needs: ~800px+ (overflow!)

## Success Criteria for Fix
1. **Zero Scroll**: `document.documentElement.scrollHeight <= window.innerHeight`
2. **All Elements Visible**: Header, phrase, and action buttons always in viewport
3. **Safe Area Compliance**: Content respects notch/home indicator areas
4. **Orientation Support**: Works in both portrait and landscape
5. **Cross-Browser**: Safari, Chrome, Firefox mobile support
6. **Performance**: No layout shift, smooth transitions

## Next Steps
1. Implement `100dvh` with `100vh` fallback
2. Add safe-area-inset support
3. Convert fixed padding to responsive `clamp()` values
4. Implement CSS Grid or refined Flexbox layout
5. Add orientation-specific media queries
6. Create Cypress tests for viewport compliance 
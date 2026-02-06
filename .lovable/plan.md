

# Fix: Background Image Top Cropping on macOS Browsers

## Problem
The top portion of the splash screen background image appears cut off or unclear in Chrome and Safari on macOS. This is visible in your screenshots where the top of the building/architectural elements are cropped.

## Root Cause
The current background positioning uses `bg-center`, which centers the image both horizontally and vertically. On screens with different aspect ratios than the image, this can crop the top portion of the image.

## Solution
Change the background position from `bg-center` to `bg-top` (or a custom position like `bg-[center_top]`) so the top of the image is always visible and any cropping happens at the bottom instead.

## Technical Changes

### File: `src/components/SplashScreen.tsx`

**Desktop container (line 51):**
- Change `bg-center` to `bg-top` to anchor the image from the top

**Mobile container (line 97):**
- Change `bg-center` to `bg-top` for consistency

| Before | After |
|--------|-------|
| `bg-cover bg-center bg-no-repeat` | `bg-cover bg-top bg-no-repeat` |

## Result
- The top of the background image (showing the building architecture) will always be visible
- Any cropping due to aspect ratio differences will happen at the bottom of the image instead
- The splash screen will look consistent across Chrome, Safari, and other browsers on macOS


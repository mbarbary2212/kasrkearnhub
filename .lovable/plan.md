
# Reduce Splash Image Size with White Frame

## Problem
The current `object-cover object-top` approach crops the top of the building images. The `object-contain` approach looks worse, especially on tablets.

## Solution
Reduce the image size and center it within a white frame. The image will be smaller but fully visible, surrounded by a clean white border.

## Changes to SplashScreen.tsx

### Desktop/Tablet Layout (Lines 58-69)

**Current structure:**
- Container fills full area
- Image uses `object-cover` and crops

**New structure:**
- Keep white background on outer container (already has `bg-white` from parent)
- Add inner padding to create the white frame effect
- Image container becomes smaller (e.g., 95% width/height)
- Image uses `object-contain` to show full image without cropping
- Center the reduced image in the container

### Mobile Layout (Lines 116-127)

Same approach - reduce image size with white frame around it.

## Implementation Details

### Desktop Container (Line 58)
Change:
```jsx
<div className="hidden md:flex relative w-full h-full rounded-lg overflow-hidden shadow-lg flex-col items-center justify-center">
```
To:
```jsx
<div className="hidden md:flex relative w-full h-full rounded-lg overflow-hidden shadow-lg flex-col items-center justify-center bg-white">
```

### Desktop Picture Element (Lines 60-69)
Change from `absolute inset-0 w-full h-full` to a reduced, centered size:
```jsx
<picture className="absolute inset-4 w-[calc(100%-2rem)] h-[calc(100%-2rem)] rounded-lg overflow-hidden">
```
And keep image as `object-cover object-top` - but now it covers a smaller area, showing more of the top.

### Mobile Container (Line 116)
Add `bg-white` for the frame background.

### Mobile Picture Element (Lines 118-127)
Change to:
```jsx
<picture className="absolute inset-3 w-[calc(100%-1.5rem)] h-[calc(100%-1.5rem)] rounded-lg overflow-hidden">
```

## Summary

| Element | Change |
|---------|--------|
| Desktop container (line 58) | Add `bg-white` explicitly |
| Desktop picture (line 60) | Change to `inset-4` with calc width/height, add `rounded-lg overflow-hidden` |
| Mobile container (line 116) | Add `bg-white` explicitly |
| Mobile picture (line 118) | Change to `inset-3` with calc width/height, add `rounded-lg overflow-hidden` |

This creates a white frame (padding) around a slightly smaller image, ensuring the full building including the top is visible without awkward scaling.

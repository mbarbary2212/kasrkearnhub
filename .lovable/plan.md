

# Fix Splash Screen Image Cropping

## Problem
The splash screen images are being cropped at the top because `object-cover` scales and crops to fill the container, even with `object-top` positioning.

## Solution
Change from `object-cover object-top` to `object-contain` positioning. This will:
- Show the complete image without cropping
- Maintain aspect ratio
- Position at the top with padding/margin for clear visibility
- Add a matching background color to fill any empty space

## Changes to SplashScreen.tsx

### Desktop/Tablet Image (Line 67)
Change:
```
className="w-full h-full object-cover object-top"
```
To:
```
className="w-full h-full object-contain object-top"
```

### Mobile Image (Line 125)
Change:
```
className="w-full h-full object-cover object-top"
```
To:
```
className="w-full h-full object-contain object-top"
```

### Add Background Color to Container
Add a sky/light blue background to the container divs to complement the watercolor building images where the image doesn't fill:

**Desktop container (Line 58):**
Add `bg-sky-100` to provide a soft background where image doesn't reach

**Mobile container (Line 116):**
Add `bg-sky-100` to provide a soft background where image doesn't reach

## Summary of File Changes

| File | Line | Change |
|------|------|--------|
| `src/components/SplashScreen.tsx` | 58 | Add `bg-sky-100` to desktop container |
| `src/components/SplashScreen.tsx` | 67 | Change `object-cover` to `object-contain` |
| `src/components/SplashScreen.tsx` | 116 | Add `bg-sky-100` to mobile container |
| `src/components/SplashScreen.tsx` | 125 | Change `object-cover` to `object-contain` |


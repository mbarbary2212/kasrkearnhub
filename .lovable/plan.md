

# Splash Screen Enhancement Plan

## Summary
Transform the splash screen from an auto-dismissing animation to an interactive welcome screen with a "Click here to log in" button. Add a white frame around the image for better presentation, and show it every time users visit the site (not just once per session).

## Current Issues
1. **Auto-dismiss**: Currently fades out automatically after 1.5-2 seconds - no time to read
2. **Session-based**: Only shows once per session (`sessionStorage` check)
3. **No interaction**: Missing a click-to-continue button
4. **Mobile image**: Portrait image exists in `/public/splash-portrait.jpeg` but may need verification
5. **No framing**: Images stretch full screen without visual frame

## Changes Overview

### 1. App.tsx - Remove Auto-Timer Logic
- Remove the `sessionStorage` check - show splash every visit
- Remove the automatic fade timers
- Add a callback function to dismiss splash when user clicks

### 2. SplashScreen.tsx - Complete Redesign
- Add white frame/border around the image for PC/tablet
- Center the image within the frame
- Add "Click here to log in" button at the bottom
- Make the entire splash clickable for convenience
- Keep responsive image switching (portrait for mobile, landscape for larger screens)

## Visual Design

**Desktop/Tablet Layout:**
```
┌─────────────────────────────────────┐
│         White Background            │
│   ┌─────────────────────────────┐   │
│   │                             │   │
│   │     Splash Image            │   │
│   │     (Landscape)             │   │
│   │                             │   │
│   └─────────────────────────────┘   │
│                                     │
│      [ Click here to log in ]       │
│                                     │
└─────────────────────────────────────┘
```

**Mobile Layout:**
```
┌─────────────────┐
│                 │
│  Splash Image   │
│  (Portrait)     │
│  Full Width     │
│                 │
│                 │
│[ Click to login]│
│                 │
└─────────────────┘
```

## Technical Details

### File: `src/App.tsx`

**Changes:**
- Remove `SPLASH_SESSION_KEY` constant and `sessionStorage` logic
- Remove the auto-fade `useEffect` with timers
- Keep `showSplash` state but initialize to `true` always
- Add `handleDismissSplash` callback function
- Pass callback to `SplashScreen` component

### File: `src/components/SplashScreen.tsx`

**Changes:**
- Accept `onDismiss` callback prop instead of `isFading`
- Create a centered layout with white background
- Add white frame/padding around the image (for tablet/PC)
- Use `object-contain` to show full image without cropping
- Add styled "Click here to log in" button
- Make the component clickable
- Add smooth entrance animation
- Keep responsive `<picture>` element for mobile vs desktop images

## Files to Modify

| File | Purpose |
|------|---------|
| `src/App.tsx` | Remove auto-timer, add click handler, show every visit |
| `src/components/SplashScreen.tsx` | Add button, white frame, click-to-dismiss |



# Splash Screen Fix Plan

## The Problem
The splash screen code already exists in your app, but the images are missing from the `public` folder. The code is looking for:
- `/splash-portrait.jpeg` - for mobile devices
- `/splash-landscape.jpeg` - for tablets and PCs

## The Solution
Copy your uploaded images to the public folder so the existing splash screen works.

## What Will Happen
1. When a user visits kalmhub.org (or refreshes the page), they'll see the beautiful KALM Hub splash image
2. On mobile phones (portrait mode), they'll see the portrait version
3. On tablets and computers, they'll see the landscape version
4. After 1.5-2 seconds, the splash fades out and reveals the landing page
5. The splash only shows once per session (navigating between pages won't show it again)

## Files to Update

| Action | File |
|--------|------|
| Copy | Landscape image → `public/splash-landscape.jpeg` |
| Copy | Portrait image → `public/splash-portrait.jpeg` |

## How It Works (Already Built)
The existing implementation in `App.tsx`:
- Uses `sessionStorage` to track if splash was shown this session
- Shows splash for 1.5 seconds, then fades over 0.5 seconds
- Only appears on initial visit or page refresh
- Uses responsive `<picture>` element to serve the right image based on screen width

No code changes needed - just adding the missing images!

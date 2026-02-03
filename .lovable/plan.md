

# Splash Screen - Thin Frame Enhancement

## Summary
Enlarge the splash images to fill nearly the entire screen with only a thin white border/frame around the edges. The click-anywhere-to-dismiss functionality already works.

## Current vs New Design

**Current State:**
- Large white padding around image (p-8 to p-12)
- Image limited to max-w-5xl and max-h-[70vh]
- Lots of empty white space

**New Design:**
- Image fills almost the entire screen
- Thin white border (8-12px) around the edges
- Subtle shadow on the image for depth
- Button positioned over the image at the bottom

## Visual Comparison

**Desktop/Tablet - Before:**
```
┌─────────────────────────────────────┐
│                                     │
│     ┌───────────────────────┐       │
│     │                       │       │
│     │   Image (70% screen)  │       │
│     │                       │       │
│     └───────────────────────┘       │
│        [ Click to log in ]          │
└─────────────────────────────────────┘
```

**Desktop/Tablet - After:**
```
┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │ ← thin white frame
│ │                                 │ │
│ │     Image (fills screen)        │ │
│ │                                 │ │
│ │      [ Click to log in ]        │ │ ← button overlay
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Mobile - After:**
```
┌─────────────────┐
│ ┌─────────────┐ │ ← thin white frame
│ │             │ │
│ │   Portrait  │ │
│ │   Image     │ │
│ │   (full)    │ │
│ │             │ │
│ │ [Log in]    │ │
│ └─────────────┘ │
└─────────────────┘
```

## Changes to Make

### File: `src/components/SplashScreen.tsx`

| Change | Before | After |
|--------|--------|-------|
| Frame padding | `p-8 lg:p-12` (32-48px) | `p-2 md:p-3` (8-12px thin frame) |
| Image max size | `max-w-5xl max-h-[70vh]` | `w-full h-full` (fill container) |
| Mobile padding | `p-4` | `p-2` |
| Button position | Below image | Positioned at bottom of image |
| Image object-fit | `object-contain` | `object-cover` (fill area) |

## Technical Details

- Remove large padding, use minimal padding for thin white border effect
- Make image container fill available space
- Position button absolutely at bottom of image area
- Use `object-cover` so image fills the frame completely
- Keep rounded corners and shadow for polish
- White background provides the thin frame appearance




# Splash Screen Button Refinement

## Summary
Make the "Click to log in" button more subtle with a transparent background and simplified text. Smaller size on mobile for better proportions.

## Changes

### Text Simplification
- **Before**: "Click here to log in"
- **After**: "Click to log in"

### Button Styling

| Property | Desktop/Tablet | Mobile |
|----------|---------------|--------|
| Background | Transparent with subtle backdrop blur | Transparent with subtle backdrop blur |
| Border | White border for visibility | White border for visibility |
| Text color | White | White |
| Padding | `px-8 py-3` (current) | `px-4 py-2` (smaller) |
| Font size | `text-lg` | `text-sm` |

### Visual Effect
The button will have:
- Transparent background (`bg-transparent` or `bg-white/10`)
- White border (`border border-white`)
- White text (`text-white`)
- Optional: subtle backdrop blur for readability over any image (`backdrop-blur-sm`)
- Hover effect: slightly more visible background (`hover:bg-white/20`)

## File to Modify

| File | Changes |
|------|---------|
| `src/components/SplashScreen.tsx` | Update button text and styling for both desktop and mobile versions |

## Code Preview

**Desktop button:**
```tsx
<button
  className="absolute bottom-8 left-1/2 -translate-x-1/2 px-8 py-3 bg-white/10 backdrop-blur-sm border border-white text-white rounded-full text-lg font-medium hover:bg-white/20 transition-colors"
  ...
>
  Click to log in
</button>
```

**Mobile button:**
```tsx
<button
  className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white text-white rounded-full text-sm font-medium hover:bg-white/20 transition-colors"
  ...
>
  Click to log in
</button>
```


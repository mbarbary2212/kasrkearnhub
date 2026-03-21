

# Plan: Auto-activate Markmap Dark Mode & Revert Forced White Background

## Summary

Instead of forcing a white background on the mind map container, detect the app's current theme and automatically activate markmap's built-in dark mode toggle when the user is in dark mode. This gives proper dark-themed maps with correct text colors natively.

## How Markmap Dark Mode Works

The markmap toolbar's dark mode button toggles a `markmap-dark` class on the SVG element, which inverts text/line colors. We can programmatically trigger this after toolbar creation by detecting the current theme.

## Changes

### 1. `src/components/study/MarkmapRenderer.tsx`
- Import `useTheme` from `next-themes`
- After toolbar is attached, check if current theme is dark
- If dark, programmatically click the dark mode toggle button in the toolbar (it's the last button with the half-circle icon), or directly add the `markmap-dark` class to the SVG
- Watch for theme changes and toggle accordingly
- Remove any forced white background styling

### 2. `src/components/study/AIMindMapCards.tsx`
- Revert the forced `bg-white` on the mind map container back to a theme-aware background (e.g., `bg-white dark:bg-gray-900` or just `bg-background`)
- The markmap's own dark mode handling will now ensure text is readable

## Technical Detail

Markmap's dark mode is controlled by a CSS class `markmap-dark` on the SVG element. We can set this directly:

```typescript
// In MarkmapRenderer, after ready:
useEffect(() => {
  if (!svgRef.current || !ready) return;
  const isDark = resolvedTheme === 'dark';
  if (isDark) {
    svgRef.current.classList.add('markmap-dark');
  } else {
    svgRef.current.classList.remove('markmap-dark');
  }
}, [resolvedTheme, ready]);
```

## Files Modified

| File | Change |
|------|--------|
| `src/components/study/MarkmapRenderer.tsx` | Add theme detection, auto-toggle `markmap-dark` class on SVG |
| `src/components/study/AIMindMapCards.tsx` | Revert forced `bg-white` to theme-aware background |


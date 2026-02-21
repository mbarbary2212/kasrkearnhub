

## Fix Mind Map PNG Image Zoom and Scrolling

### Problem

When viewing a PNG mind map image in the fullscreen modal at zoom levels above 100%, the top (and sides) of the image get clipped and cannot be scrolled to. This happens because the current implementation uses CSS `transform: scale()` to zoom, which visually enlarges the element but does **not** change its layout size. The parent container's scrollable area stays the same, so overflow content is unreachable.

### Solution

Replace the CSS `transform: scale()` approach with actual `width`/`height` sizing for the image. Instead of scaling the image, set its width to `zoom * 100%` and let it flow naturally. This makes the container's scrollable area grow with the zoom level, allowing full pan/scroll in all directions.

### Technical Details

**File: `src/components/study/MindMapViewer.tsx`**

**Change 1 -- Image display (non-drawing mode, lines ~764-777)**

Replace the current `transform: scale(zoom)` approach:
```tsx
<img
  src={fullscreenFileUrl}
  alt={fullscreenResource?.title}
  style={{ 
    transform: `scale(${zoom})`, 
    transformOrigin: 'center center',
    transition: 'transform 0.2s ease-out',
    maxWidth: '100%',
    maxHeight: '75vh',
    objectFit: 'contain',
  }}
/>
```

With a layout-based sizing approach:
```tsx
<img
  src={fullscreenFileUrl}
  alt={fullscreenResource?.title}
  style={{ 
    width: `${zoom * 100}%`,
    maxWidth: 'none',
    height: 'auto',
    transition: 'width 0.2s ease-out',
    display: 'block',
  }}
/>
```

**Change 2 -- Container wrapper (lines ~739-741)**

Update the wrapper `<div>` so it no longer tries to center the image (which fights with scroll). Use `items-start` instead of `items-center` and ensure the overflow parent can scroll in both directions:

```tsx
<div 
  className="relative p-4" 
  style={{ minHeight: '60vh' }}
>
```

This removes `flex items-center justify-center` so the image flows naturally at the top-left of the scrollable area, and the user can scroll to see every part at any zoom level.

**Change 3 -- Drawing mode (lines ~743-763)**

Apply the same sizing approach to the drawing canvas wrapper so zoom works consistently in both modes.

### What This Fixes

- At 200% zoom, the entire image is scrollable -- top, bottom, and sides are all reachable
- At 100% (default), the image fits within the viewport as before
- Zooming out below 100% also works correctly
- Drawing mode maintains the same behavior


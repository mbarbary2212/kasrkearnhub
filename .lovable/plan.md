

## Plan: Resize Body Map & Add Mobile Layout

### Problem
1. The body figure + container is too tall — it overflows on tablets and smaller laptops (the `min-h-[640px]` and `maxHeight: 620px` are excessive).
2. On mobile, the two-panel side-by-side layout breaks — "Vitals" and "Wound" labels get clipped at the right edge.

### Approach

**1. Shrink the figure container (`PhysicalExamSection.tsx`)**
- Reduce `min-h-[640px]` to `min-h-[420px]` on the two-panel wrapper.
- Reduce the left panel width from `360px` to `320px`.
- These changes make the section fit comfortably on tablet/laptop screens.

**2. Mobile-responsive layout (`PhysicalExamSection.tsx`)**
- On mobile (`< 768px`), stack the layout vertically instead of side-by-side: body map on top (constrained height ~280px), findings cards below.
- Use `useIsMobile()` hook (already exists in the project) to toggle between horizontal and vertical layouts.
- The left panel becomes `w-full` with a max-height cap instead of a fixed width.

**3. Tighten SVG for smaller display (`BodyMap.tsx`)**
- Reduce `maxHeight` from `620px` to `480px`.
- Pull right-side labels (Vitals at `x=215`, Wound at `x=215`) slightly inward to `x=200` so they don't clip on narrower containers.

### Files Modified

| File | Change |
|------|--------|
| `PhysicalExamSection.tsx` | Reduce container sizes, add mobile vertical stacking via `useIsMobile()` |
| `BodyMap.tsx` | Reduce maxHeight, nudge right-edge labels inward |


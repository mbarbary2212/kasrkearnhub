

## Plan: Fix Background Gradient + Shorten Extra Label

### Changes

**1. Container background gradient (`PhysicalExamSection.tsx`, line 174)**

Replace the solid `#0b1a2a` with a radial/linear gradient that matches the SVG body figure's blue tones — the image has a lighter blue center (~`#1a6ea0`) fading to darker edges (~`#0a1e30`). This will make the figure blend seamlessly into the container.

```
background: 'linear-gradient(180deg, #0d2a42 0%, #154a6e 35%, #1a6ea0 50%, #154a6e 75%, #0a1e30 100%)'
```

**2. Shorten extra label (`PhysicalExamSection.tsx`, line 73)**

When building the `extra` region label from legacy key `wound_assessment`, the current code produces "Wound Assessment" (or the raw label). Change the label assignment for `extra` regions to just use "Wound" — strip "Detailed Assessment" or truncate to the first word before any dash/underscore suffix.

Alternatively, hardcode a simpler label transform: if the label contains "wound", set it to just "Wound".

**3. Widen misc pill (`BodyMap.tsx`, line 180)**

The current misc pill is `width={90}` which truncates "Wound — Detailed Assessment". After shortening the label, ensure the pill width fits "Wound" comfortably (width ~90 is fine for short text).

### Files Modified

| File | Change |
|------|--------|
| `PhysicalExamSection.tsx` | Background gradient, shorten extra label |
| `BodyMap.tsx` | No change needed if label is short enough |


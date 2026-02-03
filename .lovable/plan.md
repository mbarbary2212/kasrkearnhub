

# Logo Size Adjustment Plan

## Summary
Reduce the logo size across the application and fix the horizontal cropping issue. The current implementation uses `scale-[1.8]` which crops the logo from all sides (including right and left). We'll adjust the cropping technique to only crop vertically (top/bottom) while preserving the full horizontal width.

## Changes Overview

### 1. Header Navigation (`src/components/layout/MainLayout.tsx`)

**Current State:**
- Mobile: `h-[120px]` with container `h-10` (too big)
- Desktop: `h-[84px]` with container `h-14`
- Uses `scale-[1.8]` which crops all sides

**New State:**
- Same size for both mobile and desktop/tablet
- Container: `h-14` (consistent across all breakpoints)
- Logo: `h-[84px]` (same for all sizes)
- Remove `scale-[1.8]`, use only vertical cropping via `object-cover` and `object-center`

### 2. Landing Page (`src/pages/Home.tsx`)

**Current State:**
- Container: `h-32 md:h-40`
- Logo: `h-[200px] md:h-[280px]` with `scale-[1.8]`
- Too large, especially on mobile

**New State:**
- Reduce container: `h-24 md:h-32` (smaller overall)
- Reduce logo: `h-[140px] md:h-[180px]`
- Remove `scale-[1.8]`, keep horizontal aspect intact
- Use `object-contain` to preserve full width

### 3. Auth Pages (`src/pages/Auth.tsx`)

There are 5 instances of the logo across different auth views:
- Reset password view (line 224-226)
- Forgot password view (line 305-306)
- Change password view (line 369-370)
- Already signed in view (line 438-439)
- Main login/signup view (line 481-482)

**Current State:**
- Container: `h-24 md:h-28`
- Logo: `h-[140px] md:h-[160px]` with `scale-[1.8]`

**New State:**
- Keep container size: `h-24 md:h-28`
- Reduce logo slightly: `h-[120px] md:h-[140px]`
- Remove `scale-[1.8]` to stop horizontal cropping
- Use `object-contain` instead of `object-cover`

---

## Technical Details

### Cropping Strategy Change

**Before (crops all sides):**
```tsx
<div className="overflow-hidden h-XX">
  <img className="h-[XXX] object-cover scale-[1.8]" />
</div>
```

**After (crops only top/bottom, preserves left/right):**
```tsx
<div className="overflow-hidden h-XX flex items-center justify-center">
  <img className="h-[XXX] w-auto object-contain" />
</div>
```

The key changes:
1. Remove `scale-[1.8]` - this was causing horizontal cropping
2. Change `object-cover` to `object-contain` - preserves aspect ratio
3. Add `w-auto` - ensures natural width is maintained
4. Use container height to clip only the vertical excess white space

### Files to Modify

| File | Line Range | Changes |
|------|------------|---------|
| `src/components/layout/MainLayout.tsx` | 110-111 | Unify mobile/desktop size, remove scale |
| `src/pages/Home.tsx` | 97-102 | Reduce size, remove scale |
| `src/pages/Auth.tsx` | 224-226, 305-306, 369-370, 438-439, 481-482 | Remove scale, reduce size slightly |


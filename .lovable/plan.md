

## Fix Mobile "Learning" Tab to Match Desktop Behavior

### Problem
The mobile bottom nav's "Learning" tab only checks the current URL to decide where to navigate. It doesn't use `useLastPosition` like the desktop sidebar does. So:
- If a student is on Dashboard and taps "Learning" — it goes to `/learning` instead of resuming their last chapter
- If no chapter was ever visited — it should go to `/` (dashboard), not `/learning`

### Fix

**File: `src/components/layout/MobileBottomNav.tsx`**

1. Import `useLastPosition` and `buildResumeUrl` from `@/hooks/useLastPosition`
2. Call `const { data: lastPosition } = useLastPosition()` in the component
3. Update the `handleTap` logic for `tab.id === 'learning'`:

```
if (tab.id === 'learning') {
  // If already on a chapter/module page, stay contextual (existing logic)
  const chapterMatch = location.pathname.match(/^(\/module\/[^/]+\/chapter\/[^/]+)/);
  if (chapterMatch) {
    navigate(`${chapterMatch[1]}?section=resources`);
    return;
  }
  const moduleMatch = location.pathname.match(/^(\/module\/[^/]+)/);
  if (moduleMatch) {
    navigate(moduleMatch[1]);
    return;
  }
  // Not on a module/chapter page — use last position or fall back to dashboard
  if (lastPosition) {
    navigate(buildResumeUrl(lastPosition));
  } else {
    navigate('/');
  }
  return;
}
```

This mirrors the exact desktop sidebar logic: contextual navigation when inside a module, resume last position otherwise, dashboard as final fallback.

### Files
- `src/components/layout/MobileBottomNav.tsx` — add `useLastPosition` hook and update Learning tap handler


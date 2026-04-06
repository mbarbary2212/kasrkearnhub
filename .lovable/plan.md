

# Fix Guided Tour UX Issues

## Problems Identified

From the screenshot: both the **FirstLoginModal** and the **driver.js tour** are showing simultaneously. The tour auto-starts on its own (via `useTour` auto-start logic) regardless of whether the user chose "Take a quick tour" from the modal. Additionally, the overlay is too dark (0.6 opacity), and there's no "don't show again" checkbox.

## Changes

### 1. Stop tour from auto-starting — let FirstLoginModal control it

**File: `src/hooks/useTour.ts`**

- **Remove** the auto-start logic (the two `useEffect` blocks that check `hasSeen` and set `tourReady`). The tour should only start when explicitly triggered: either from the FirstLoginModal "Take a quick tour" button, or from the sidebar "Take a Tour" menu item.
- Keep the `kalm:start-tour` event listener for manual triggers.
- This fixes the double-popup issue (modal + tour firing together).

### 2. Add "Don't show again" checkbox to the FirstLoginModal

**File: `src/components/guidance/FirstLoginModal.tsx`**

- Add a checkbox: "Don't show this again" above the Skip button.
- When checked and user clicks Skip (or closes), set `kalm_tour_student_done` / `kalm_tour_admin_done` in addition to the first-login key — this prevents the modal from ever reappearing AND prevents any future tour auto-trigger.
- Change "Skip for now" text to just "Skip" when checkbox is checked.

### 3. Reduce overlay darkness

**File: `src/hooks/useTour.ts`**

- Change `overlayColor` from `'rgba(0, 0, 0, 0.6)'` to `'rgba(0, 0, 0, 0.3)'` — lighter dimming so users can still see the app behind the tour.
- Increase `stagePadding` from 8 to 12 for better visual clarity of highlighted elements.

### 4. Add "Don't show again" button to the tour popover

**File: `src/hooks/useTour.ts`**

- Add `doneBtnText: "Finish"` and a custom `onNextClick` or use driver.js's built-in `popoverClass` to add a "Don't show again" link in the final step.
- Simpler approach: The tour already marks done on close/complete via `markDone()`. Add `showButtons: ['next', 'previous', 'close']` config. The existing `onDestroyStarted` already calls `markDone()`, so closing/completing the tour = won't show again. This is already working — the real issue is that the tour auto-fires without user consent.

## Summary of Behavior After Fix

1. **First visit**: FirstLoginModal appears. User picks "Take a tour", "Learn how to use", or "Skip".
2. **If "Take a tour"**: Modal closes, tour starts with light overlay.
3. **If "Skip" + "Don't show again" checked**: Modal never shows again, tour never auto-fires.
4. **If "Skip" without checkbox**: Modal won't show again (first-login key set), but user can still trigger tour from sidebar.
5. **Tour overlay**: Light enough to see the app clearly behind it.

## Files Modified (3)

| File | Change |
|------|--------|
| `src/hooks/useTour.ts` | Remove auto-start effects, reduce overlay opacity |
| `src/components/guidance/FirstLoginModal.tsx` | Add "Don't show again" checkbox, wire it to tour keys |
| `src/pages/Home.tsx` | No changes needed (already wired correctly) |


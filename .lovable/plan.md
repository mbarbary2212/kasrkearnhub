

## Mobile Chapter Page: Overlay Section Switcher

### Problem
On mobile (390px), the chapter page has a horizontal tab bar (Resources / Interactive / Practice / Test) that takes up vertical space and can overflow horizontally. The content is too wide and there's too much chrome eating into the limited viewport.

### Solution
Replace the inline section tabs on mobile with a **semi-transparent overlay** that pops up from the bottom nav's "Learning" tab. The four section options (Resources, Interactive, Practice, Test) appear as a compact floating overlay — similar to a quick-action menu — then dismiss after selection.

### Design

1. **Remove the inline mobile section nav** (lines 631-654 in ChapterPage.tsx) on mobile when on a chapter page.

2. **Modify MobileBottomNav.tsx** so that tapping "Learning" while already on a chapter page opens a semi-transparent overlay with the 4 section options (Resources, Interactive, Practice, Test) as small icon+label buttons — styled like the bottom nav items themselves (icon above short label, same compact sizing).

3. **Visual hint** — When on a chapter page, the Learning icon in the bottom nav gets a subtle pulsing ring animation (CSS `animate-pulse` or a custom gentle pulse) to signal there are sub-options. Additionally, show a small chevron-up indicator above the Learning icon.

4. **Overlay styling** — The overlay pops up above the bottom nav bar as a `bg-card/90 backdrop-blur-xl` panel with rounded top corners. It contains the 4 section icons in a horizontal row (same style as bottom nav). Tapping one sets the section and dismisses the overlay. Tapping outside dismisses it.

5. **Compact all remaining pills/icons on mobile** — Reduce filter pill sizes (`text-[11px] px-2 py-1`), sub-tab dropdown trigger padding, and badge sizes across ChapterPage mobile view to maximize content area.

### Files to edit

- **`src/components/layout/MobileBottomNav.tsx`** — Add section overlay state, render overlay panel on chapter pages, add pulse animation to Learning icon
- **`src/pages/ChapterPage.tsx`** — Remove the mobile inline section nav (lines 631-654), keep desktop nav rail unchanged
- **`src/index.css`** — Add a gentle pulse keyframe animation if needed

### Technical notes
- Overlay uses a simple `useState<boolean>` in MobileBottomNav
- Section change communicated via URL search params (`?section=resources`) — already the pattern used
- The overlay reads current `?section` param to highlight the active section
- Clicking outside or selecting a section dismisses the overlay
- Desktop layout is completely untouched


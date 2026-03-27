

## Universal Scroll Chaining

### Current State

The codebase is already mostly clean:
- **`overscroll-contain`** only exists on flashcard components (4 files) — these are intentionally exempt to prevent swipe gesture conflicts
- **No custom scroll `preventDefault`** handlers that trap scroll
- **Radix Dialog/Sheet** containers use `overflow-hidden` on the outer shell, with inner content scrolling via `overflow-y-auto` or `ScrollArea`

The main scroll-trapping sources are:
1. **Radix's `ScrollArea` component** — the Viewport doesn't set `overscroll-behavior: auto`, so browsers may default to trapping
2. **Radix Dialog's body scroll lock** — applies `data-scroll-locked` and `overflow: hidden` on `<body>`, which is expected for modals but means scroll can't chain to the page behind (this is correct modal behavior)
3. **ConnectModal's manual body scroll lock** — `position: fixed` on body (lines 25-34)

### Plan

**File 1: `src/components/ui/scroll-area.tsx`**
- Add `overscroll-behavior: auto` to the `ScrollAreaPrimitive.Viewport` element via a style prop or className
- This ensures all `ScrollArea` instances (coach panel, tutor chat, command menus, selects) chain scroll to parent when boundaries are reached

**File 2: `src/index.css` (or global CSS)**
- Add a global rule targeting common scrollable containers to default to `overscroll-behavior: auto`:
  ```css
  [data-radix-scroll-area-viewport],
  [role="dialog"] [style*="overflow"],
  .overflow-y-auto,
  .overflow-auto {
    overscroll-behavior: auto;
  }
  ```
- Add an override to preserve `overscroll-contain` on flashcard elements:
  ```css
  .overscroll-contain {
    overscroll-behavior: contain !important;
  }
  ```

**File 3: `src/components/connect/ConnectModal.tsx`**
- On the scrollable content div (line 114), add `overscroll-behavior-y: auto` to ensure scroll chains to backdrop/page when inner content is exhausted

**File 4: `src/components/tutor/TutorChatPanel.tsx`**
- The `ScrollArea` fix from File 1 covers this automatically — no additional changes needed

**No changes to:**
- Flashcard components (keep `overscroll-contain` for swipe gesture isolation)
- Dialog/Sheet body scroll locks (standard modal behavior — scroll chaining within the modal's own nested containers is what matters)

### Result
- 2-3 files changed (scroll-area.tsx, index.css, ConnectModal.tsx)
- All scrollable containers chain naturally to their parent when boundaries are hit
- Flashcards remain isolated for gesture support
- No custom scroll physics or event handlers needed


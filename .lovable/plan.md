

## Fix: Eliminate Horizontal Scrolling on Mobile

### Root Cause Analysis

The horizontal scrolling on mobile comes from multiple sources:

1. **ChapterPage wrapper** uses `-mx-4` (negative margin) to break out of container, but the inner `px-3` doesn't fully compensate, causing content to exceed viewport width
2. **No global `overflow-x: hidden`** on the page body or root — any child element that's even 1px too wide causes a horizontal scrollbar
3. **Content cards** (accordions, flashcards, study resources) use `px-4` padding inside bordered containers that don't respect `min-w-0` constraints
4. **Tables and wide content** inside study resources and lecture lists can overflow their containers

### Solution — Two-Layer Fix

**Layer 1: Global mobile overflow clamp** — Add `overflow-x: hidden` to the root layout on mobile only. This is the nuclear fix that guarantees no horizontal scroll regardless of any child misbehaving.

**Layer 2: Fix the actual overflow sources** — So content isn't clipped unexpectedly.

### Changes

**1. `src/index.css`** — Add global mobile overflow guard:
```css
@media (max-width: 767px) {
  html, body, #root {
    overflow-x: hidden;
    max-width: 100vw;
  }
}
```

**2. `src/pages/ChapterPage.tsx`** — Fix the negative margin pattern:
- Change `-mx-4` to `-mx-2 md:-mx-4` on the wrapper div (line 523)
- This matches the `px-2 md:px-4` on `<main>` in MainLayout, so the breakout is exact and doesn't cause overflow

**3. `src/components/layout/MainLayout.tsx`** — Add `overflow-x-hidden` to the main content area on mobile:
- Add `overflow-x-hidden` to the `<main>` element

**4. `src/components/study/StudyResourcesSection.tsx`** — Add `min-w-0` to accordion items and reduce mobile padding:
- Change `px-4` to `px-2 md:px-4` on `AccordionItem`
- This prevents bordered card content from pushing beyond viewport

**5. `src/components/content/ChapterProgressBar.tsx`** — Ensure progress bar respects container width:
- Add `min-w-0 overflow-hidden` to the progress bar wrapper

These 5 changes together guarantee zero horizontal scroll on mobile while preserving the desktop layout entirely.


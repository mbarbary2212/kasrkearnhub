

## Plan: Shrink Chapter Heading + Add Labeled "Customize Your View" Button (Desktop/Tablet Only)

### Changes

**Both `ChapterPage.tsx` and `TopicDetailPage.tsx`:**

1. **Reduce desktop heading size**: Change `text-2xl` → `text-lg` on the desktop `<h1>` element. This frees up horizontal space in the header row.

2. **Replace icon-only button with labeled button on desktop/tablet**: Replace the current `size="icon"` ghost button with a proper labeled button that says "Customize Your View" with the SlidersHorizontal icon. This button uses `hidden md:inline-flex` so it only appears on desktop/tablet (≥768px).

3. **Keep mobile as-is**: The existing icon-only button stays for mobile using `md:hidden`, unchanged.

### Specific Edits

**`src/pages/ChapterPage.tsx` (lines 432, 466-476)**:
- Line 432: `text-2xl` → `text-lg`
- Lines 466-476: Replace single icon button with two variants:
  - `md:hidden` icon-only button (existing behavior)
  - `hidden md:inline-flex` outlined button with text "Customize Your View" + SlidersHorizontal icon

**`src/pages/TopicDetailPage.tsx` (lines 390, 414-424)**:
- Line 390: `text-2xl` → `text-lg`
- Lines 414-424: Same two-button pattern as ChapterPage

### No Other Files Modified


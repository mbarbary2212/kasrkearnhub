

## Plan: Improve Interactive Sub-Tab Visibility

### Problem
The "Cases" tab uses a green filled pill when active, making it visually dominant, while "Pathways" looks like plain text. Users miss "Pathways" entirely because the contrast between active and inactive states is too extreme.

### Solution
Make both sub-tabs visually equal as outlined pill buttons by default (both with an amber/interactive-section border), then fill the selected one with a solid amber/interactive accent. This way both options are clearly visible as clickable choices.

### Changes

**`src/pages/ChapterPage.tsx` (lines 766-771)** and **`src/pages/TopicDetailPage.tsx` (lines 714-719)**

Update the interactive tab button styling:

- **Inactive state**: `border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100` — a visible outlined pill so it clearly looks like a clickable tab, not plain text.
- **Active state**: `bg-amber-500 text-white font-medium shadow-sm border border-amber-500` — solid filled amber pill to indicate selection.

This gives both "Cases" and "Pathways" equal visual weight when browsing, and clearly highlights whichever one is selected.

### Visual Result

```text
BEFORE:
  [Cases 8]  Pathways 2      ← Pathways looks like plain text

AFTER (Cases selected):
  [Cases 8]  (Pathways 2)    ← both are pill-shaped, selected one is solid amber

AFTER (Pathways selected):
  (Cases 8)  [Pathways 2]    ← same treatment, just swapped
```

### Files
- `src/pages/ChapterPage.tsx` — update interactive tab button classes (~2 lines)
- `src/pages/TopicDetailPage.tsx` — mirror the same change (~2 lines)




# Hide Admin Badges + Add App Mind Map (Markdown to HTML)

## Part 1: Hide Badge/Trophy from Admin UI

### File: `src/components/layout/MainLayout.tsx`
- Wrap the trophy button (lines 121-139) with `{!isAdmin && ...}` so only students see it
- Wrap the badge count indicator on avatar (lines 173-178) with `{!isAdmin && ...}`
- Wrap `HeaderBadgesPanel` (line 244) with `{!isAdmin && ...}`

No imports removed -- they're still used conditionally.

---

## Part 2: App Mind Map (Markdown rendered as HTML)

Instead of the interactive SVG-based Markmap library, we'll use `react-markdown` to render your Markdown content as clean, styled HTML inside a dialog.

### Installation
One package needed:
- `react-markdown` -- converts Markdown to React/HTML elements

### New file: `src/components/dashboard/AppMindMap.tsx`
- Accepts `open` / `onOpenChange` props
- Contains your app structure as a Markdown string (the same content you wrote)
- Uses `react-markdown` to render it as formatted HTML (headings, nested lists)
- Displayed inside a full-width `Dialog` with scroll support
- Styled with Tailwind to look clean (indented lists, colored headings)

### File: `src/pages/Home.tsx`
- Add a small icon button (e.g., `Network` or `Map` icon from lucide-react) near the "Academic Years" heading
- Clicking it opens the `AppMindMap` dialog
- Only shown to logged-in users

### What it will look like
Your Markdown content rendered as a nicely formatted document with:
- Hierarchical headings (h1, h2, h3, etc.)
- Nested bullet lists for sub-items
- Clean typography with proper spacing
- Scrollable dialog that can be closed/collapsed

---

## Files Summary

| File | Change |
|------|--------|
| `src/components/layout/MainLayout.tsx` | Hide trophy, badge count, badges panel for admins |
| `src/components/dashboard/AppMindMap.tsx` | New -- Markdown-to-HTML mind map in a Dialog |
| `src/pages/Home.tsx` | Add button to open the mind map dialog |
| `package.json` | Add `react-markdown` |


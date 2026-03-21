

# Plan: Add Inline Markdown Editor to Mind Map Viewer

## Summary

Add the ability for admins to edit the markmap markdown directly in the mind map detail dialog. Changes update the rendered map in real-time and can be saved back to the database.

## How It Works

```text
Admin clicks mind map card → Dialog opens
  ├─ View tab: Interactive markmap (current behavior)
  └─ Edit tab: Split-pane with markdown editor + live preview
       └─ Save button → updates markdown_content in mind_maps table
```

## Changes

### 1. `src/hooks/useMindMaps.ts`
- Add `useUpdateMindMapMarkdown` mutation that updates `markdown_content` (and `updated_at`) on the `mind_maps` table by id

### 2. `src/components/study/AIMindMapCards.tsx`
- Add a "Code / View" toggle (using Tabs or simple buttons) in the dialog header (admin-only via `useAuthContext`)
- **View mode** (default): Current MarkmapRenderer — no change
- **Edit mode**: Split layout with a `<textarea>` (monospace, code-style) on the left and a live `MarkmapRenderer` preview on the right (or stacked on mobile)
- Local state holds edited markdown; changes update the preview in real-time
- "Save" button calls `useUpdateMindMapMarkdown`, updates the `viewingMap` state, and shows a success toast
- "Discard" resets to original markdown

### 3. Responsive behavior
- Desktop: side-by-side editor + preview
- Mobile: stacked with a toggle between editor and preview

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useMindMaps.ts` | Add `useUpdateMindMapMarkdown` mutation |
| `src/components/study/AIMindMapCards.tsx` | Add edit/view toggle, textarea editor, save/discard buttons (admin only) |


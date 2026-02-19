
# Concepts Bulk Upload + Side-by-Side Layout

## Overview
Add a bulk upload modal to the ConceptsManager supporting three input modes (line-by-line, CSV paste, file upload), and place the Sections and Concepts manager cards side-by-side on tablet/desktop.

## Layout Change

Wrap `SectionsManager` and `ConceptsManager` in a responsive grid on both `ChapterPage.tsx` and `TopicDetailPage.tsx`:

```text
Before (stacked):               After (side-by-side on md+):
[SectionsManager]                [SectionsManager] [ConceptsManager]
[ConceptsManager]                (single column on mobile)
```

Remove `max-w-2xl` from both cards and add `min-w-0` to prevent overflow.

## Bulk Upload Modal

### Input Modes (tabs within modal)

1. **Lines (default)** -- Textarea where each line becomes a concept. Primary workflow for pasting from ChatGPT.
2. **CSV** -- Textarea for `title,concept_key` format. Missing keys auto-generated.
3. **File Upload** -- Drag-and-drop for `.csv` / `.xlsx` files using existing `DragDropZone` and `xlsx` package.

### Normalization Helper

A shared `normalizeConceptKey(text)` function applied to ALL input modes:
- Lowercase, trim
- Replace `&` with `and`
- Remove punctuation (except underscores)
- Spaces/dashes become `_`
- Collapse multiple underscores
- Max length 64 characters
- Empty result = validation error

This helper will also replace the inline normalization currently in `ConceptsManager` (lines 101 and 125).

### Preview Table

Columns: Title | Concept Key | Status

Status badges:
- Green "New" -- will be created
- Yellow "Exists" -- already in chapter (skipped or updated)
- Red "Invalid" -- missing title or empty key

Confirm button disabled if any red rows exist.

### Duplicate Policy

Radio group in preview step:
- **Skip duplicates** (default) -- existing concepts are ignored
- **Update existing title** -- uses `useUpdateConcept` to rename matches

### Display Order

New concepts get `display_order = maxExistingDisplayOrder + 1 + rowIndex` so they append after existing concepts without disrupting current ordering.

### Success

- Close modal
- Invalidate concepts query (auto-refresh)
- Toast: "12 concepts created, 3 skipped"

## Files

| File | Action |
|---|---|
| `src/components/concepts/ConceptBulkUploadModal.tsx` | Create -- modal with 3 input tabs, preview table, confirm |
| `src/lib/conceptNormalization.ts` | Create -- `normalizeConceptKey()` helper |
| `src/components/concepts/ConceptsManager.tsx` | Modify -- add Upload button, remove `max-w-2xl`, use shared normalizer |
| `src/components/sections/SectionsManager.tsx` | Modify -- remove `max-w-2xl` |
| `src/pages/ChapterPage.tsx` | Modify -- wrap managers in `grid gap-4 md:grid-cols-2` |
| `src/pages/TopicDetailPage.tsx` | Modify -- same grid wrapper |
| `src/components/concepts/index.ts` | Modify -- export `ConceptBulkUploadModal` |

## Technical Details

- Uses existing `xlsx` package for XLSX parsing
- Uses existing `DragDropZone` component for file upload
- Uses existing `useCreateConcept` and `useUpdateConcept` mutations (sequential inserts)
- No database changes needed
- No new dependencies needed

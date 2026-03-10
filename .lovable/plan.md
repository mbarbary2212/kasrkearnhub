

# Fix SBA Preview in AI Content Factory

## Problem
The `AIContentPreviewCard` component has explicit rendering for `'mcq'` but not for `'sba'`. Since SBAs share the same data structure (stem, choices, correct_key, explanation), the `'sba'` content type falls through to the `default` case in all three render functions, showing raw JSON instead of a human-readable preview.

## Fix
Add `'sba'` alongside `'mcq'` in all three switch statements in `AIContentPreviewCard.tsx`:

1. **`renderCollapsedPreview()`** (line 104) — change `case 'mcq':` to `case 'mcq': case 'sba':`
2. **`renderFullView()`** (line 556) — change `case 'mcq':` to `case 'mcq': case 'sba':`
3. **`renderEditForm()`** (line 228) — change `case 'mcq':` to `case 'mcq': case 'sba':`

This is a 3-line change. The collapsed preview will show stem + choices + correct answer. The full view and edit form will render identically to MCQs. The badge already reads the `contentType` dynamically so it will correctly display "SBA #1", "SBA #2", etc.


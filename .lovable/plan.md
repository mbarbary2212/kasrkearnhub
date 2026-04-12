

## Plan: Fix Cloze Flashcard Duplicate Detection

### Root Cause

The duplicate detection compares `front` and `back` fields. Cloze cards store their content in `cloze_text` instead, leaving `front` and `back` empty. This means **every cloze card compares as empty-string vs empty-string**, and they all appear as "exact duplicates" of each other.

This is NOT related to deleted items — deleted items are already correctly excluded from the comparison.

### Fix

**File: `src/components/study/StudyBulkUploadModal.tsx`**

Update the `detectDuplicates` function to use the correct field based on card type:

- When building comparison objects from existing resources and parsed items, check `card_type`
- If `card_type === 'cloze'`: use `cloze_text` as the `front` field for comparison (and keep `back` as the `extra` or back field)
- If `card_type === 'normal'` or undefined: use `front`/`back` as before

```
// Instead of:
front: (r.content as FlashcardContent).front || ''

// Use:
front: content.card_type === 'cloze' 
  ? (content.cloze_text || '') 
  : (content.front || '')
```

Apply the same logic to both `existingForComparison` and `parsedForComparison` arrays (lines ~127-136).

### No other files need changes
The core `isFlashcardDuplicate` function in `duplicateDetection.ts` is fine — it correctly compares whatever `front`/`back` strings it receives. The bug is solely in how those strings are extracted from cloze card content.


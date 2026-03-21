

# Plan: Use Tags Column as Card Title/Grouping

## What Changes

**Single file: `src/components/study/StudyBulkUploadModal.tsx`**

### 1. Map `Tags` column to title instead of skipping it

In `buildHeaderMapping` (line 674), change `'tags': '__skip__'` to `'tags': 'title'`. This means when there's no `title` column but there is a `Tags` column, the Tags value becomes the card's title, which is also what the "topic filter" uses for grouping.

### 2. Update title fallback priority

In `parseLineByType` (lines 473-481), adjust the cloze title logic:
- First: use `title` column if present
- Second: use `tags` column value (now mapped to `title`, so this happens automatically)
- Third (fallback): auto-generate from first 60 chars of stripped cloze text (existing behavior)

Since `tags` maps to `title` in the header mapping, the existing `titleIdx = headerMapping?.['title']` will automatically pick up the Tags value. The fallback for missing title already works. No logic change needed here — just the mapping change.

### 3. Update CSV format hint

Update `CSV_FORMAT_FLASHCARD_CLOZE` to mention that `Tags` can be used for grouping:
```
text,extra,tags
"{{c1::answer}} in context","Extra info","Group Name"
```

## Summary

One mapping change (`'tags': 'title'` instead of `'tags': '__skip__'`) plus a format hint update. Cards with the same Tags value will group together in the topic filter dropdown.


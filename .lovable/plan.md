

# Fix Chapter Numbering: Per-Department Instead of Per-Module

## Problem

The database has a unique constraint `(module_id, chapter_number)` which forces chapter numbers to be unique across the entire module. But you want each department to have its own numbering (e.g., Histology Ch 1-5, Anatomy Ch 1-3, Physiology Ch 1-4 -- all within the same module).

## Solution

### 1. Database Migration

Drop the existing constraint and replace it with one scoped to department:

```sql
ALTER TABLE module_chapters
  DROP CONSTRAINT module_chapters_module_id_chapter_number_key;

ALTER TABLE module_chapters
  ADD CONSTRAINT module_chapters_module_book_chapter_unique
  UNIQUE (module_id, book_label, chapter_number);
```

This allows chapter number 1 to exist in multiple departments within the same module.

### 2. File: `src/components/module/ChapterFormModal.tsx`

The current auto-increment logic (lines 50-51) already filters by `book_label` -- so no code change needed here. It was correct all along; the database constraint was the only blocker.

### 3. File: `src/hooks/useModuleBooks.ts`

In `useAddBook` (around line 95), a placeholder chapter is created with `chapter_number: 1`. This is already correct since the new constraint scopes uniqueness to `(module_id, book_label, chapter_number)`.

## Summary

| Change | Detail |
|--------|--------|
| Database migration | Replace `UNIQUE(module_id, chapter_number)` with `UNIQUE(module_id, book_label, chapter_number)` |
| Code changes | None needed -- existing logic already numbers per-department |

This is a database-only fix. Each department will have independent chapter numbering (Ch 1, Ch 2, ...) regardless of how many departments a module has.


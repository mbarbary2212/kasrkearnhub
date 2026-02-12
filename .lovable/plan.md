
# Rename "Lecture(s)" to "Chapter(s)" in All UI Labels

## Overview

The items listed under each department/book on the module page are actually chapters (e.g., "Introduction", "Cytology", "Blood"), not lectures. This change renames all user-facing "Lecture" text to "Chapter" throughout the app. No database or routing changes needed -- this is purely a display label rename.

## Files to Modify

### 1. `src/components/module/ModuleLearningTab.tsx`
The main file with most visible "Lecture" labels:
- Line 144: `'Lecture' : 'Lectures'` --> `'Chapter' : 'Chapters'`
- Line 239: toast `'Lecture deleted successfully'` --> `'Chapter deleted successfully'`
- Line 242: toast `'Failed to delete lecture'` --> `'Failed to delete chapter'`
- Line 269: Button `Add Lecture` --> `Add Chapter`
- Line 277: Label `Lectures` --> `Chapters`
- Line 343: `No lectures available yet.` --> `No chapters available yet.`
- Line 353: Button `Add First Lecture` --> `Add First Chapter`
- Line 365: `chapterPrefix="Lecture"` --> `chapterPrefix="Chapter"`
- Line 374: Dialog title `Delete Lecture` --> `Delete Chapter`
- Line 377: Dialog description `...this lecture.` --> `...this chapter.`
- Comments on lines 179, 208, 359, 655, 683: update for clarity

### 2. `src/components/module/BookFormModal.tsx`
- Line 31: `{ value: 'Lec', label: 'Lecture (Lec)' }` --> `{ value: 'Ch', label: 'Chapter (Ch)' }` (or remove the "Lec" option entirely since both are now "Chapter")

### 3. `src/components/content/LectureList.tsx`
- Line 228: `No lectures available yet.` --> `No chapters available yet.`

### 4. `src/components/content/LecturesAdminTable.tsx`
- Line 100: `emptyMessage="No lectures available"` --> `emptyMessage="No chapters available"`

### 5. `src/pages/AdminPage.tsx`
- Any user-facing "Lecture" labels in the integrity/orphan check UI

### 6. `supabase/functions/integrity-orphaned-all/index.ts`
- Line 63: `label: "Lecture"` --> `label: "Chapter"`

## What Does NOT Change

- Database table names (`lectures`) stay the same
- Query keys (`'lectures'`, `'chapter-lectures'`, etc.) stay the same
- Internal type names and variable names stay the same
- The tab label in ChapterPage is already "Videos" (not "Lectures"), so no change needed there
- Route paths stay the same

## Summary

This is a safe, display-only rename across approximately 6 files, changing all user-visible instances of "Lecture(s)" to "Chapter(s)" to accurately reflect the content structure.

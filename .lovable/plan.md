

## Preserve Section Info + Warning Across All Bulk Uploads

### What This Fixes

When admins upload content before creating sections, section info from the file is lost forever because there are no matching sections yet. This change preserves that info and warns admins proactively.

### Part 1: Database -- Add Preservation Columns

Add `original_section_name` (TEXT) and `original_section_number` (TEXT) to every content table that has a `section_id`:

- `osce_questions`
- `study_resources`
- `mcqs`
- `mcq_sets`
- `essays`
- `lectures`
- `resources`
- `practicals`
- `matching_questions`
- `true_false_questions`
- `virtual_patient_cases`

One migration adding all columns at once.

### Part 2: Reusable Warning Component

Create a new `SectionWarningBanner` component that:
- Accepts `chapterId` / `topicId`
- Checks if sections exist using existing hooks (`useChapterSections` / `useTopicSections`)
- Shows a yellow warning when no sections have been created: "No sections created yet. Section info from your file will be saved so you can auto-tag content later."
- Shows nothing if sections already exist

### Part 3: Add Warning to All Bulk Upload Modals

Insert the `SectionWarningBanner` into:
- `OsceBulkUploadModal`
- `StudyBulkUploadModal`
- `TrueFalseBulkUploadModal`
- `MatchingQuestionBulkUploadModal`
- `McqList` (MCQ bulk import dialog)
- `AdminContentActions` (Essay bulk upload dialog)

### Part 4: Save Original Section Info During Import

For every bulk upload path, pass `original_section_name` and `original_section_number` alongside the insert data. This applies to:

**Already have section parsing (just need to save originals):**
- `OsceBulkUploadModal` + `bulk-import-osce` edge function
- `StudyBulkUploadModal` + `useBulkCreateStudyResources` hook
- `MatchingQuestionBulkUploadModal` + `useBulkCreateMatchingQuestions` hook
- `AdminContentActions` (essay upload)

**Need to ADD section parsing + saving:**
- `TrueFalseBulkUploadModal` + `parseTrueFalseCsv` + `bulk-import-true-false` edge function -- add `section_name` and `section_number` columns to CSV format
- `McqList` MCQ bulk import + `bulk-import-mcqs` edge function -- add section fields to CSV parsing

### Part 5: Update Edge Functions

- `bulk-import-osce/index.ts` -- include `original_section_name`, `original_section_number` in insert
- `bulk-import-mcqs/index.ts` -- add section parsing, resolve section_id, save originals
- Create or update T/F edge function to accept and save section info + originals

### Technical Details

**New component: `src/components/sections/SectionWarningBanner.tsx`**
```
Accepts: chapterId?, topicId?
Uses: useChapterSections / useTopicSections
Renders: Alert with AlertTriangle icon when sections.length === 0
```

**Database migration (single SQL file):**
```sql
ALTER TABLE osce_questions ADD COLUMN IF NOT EXISTS original_section_name TEXT;
ALTER TABLE osce_questions ADD COLUMN IF NOT EXISTS original_section_number TEXT;
-- (repeated for all 11 tables)
```

**True/False CSV format update:**
Current: `statement,correct_answer,explanation,difficulty`
New: `statement,correct_answer,explanation,difficulty,section_name,section_number`

**MCQ CSV format update:**
Add `section_name,section_number` columns (with flexible header detection like other uploads).

### Files to Create/Modify

| File | Change |
|---|---|
| New migration | Add `original_section_name` + `original_section_number` to 11 content tables |
| `src/components/sections/SectionWarningBanner.tsx` | New reusable warning component |
| `src/components/sections/index.ts` | Export new component |
| `src/components/content/OsceBulkUploadModal.tsx` | Add warning banner; save originals during insert |
| `src/components/study/StudyBulkUploadModal.tsx` | Add warning banner; save originals during insert |
| `src/components/content/TrueFalseBulkUploadModal.tsx` | Add warning banner; add section CSV parsing; save originals |
| `src/components/content/MatchingQuestionBulkUploadModal.tsx` | Add warning banner; save originals during insert |
| `src/components/content/McqList.tsx` | Add warning banner to MCQ bulk dialog; add section parsing |
| `src/components/admin/AdminContentActions.tsx` | Add warning banner to essay upload; save originals |
| `src/hooks/useTrueFalseQuestions.ts` | Update `parseTrueFalseCsv` to parse section columns; update form data type |
| `src/hooks/useStudyResources.ts` | Include `original_section_name/number` in bulk insert |
| `src/hooks/useMatchingQuestions.ts` | Include originals in bulk insert |
| `supabase/functions/bulk-import-osce/index.ts` | Save originals in insert |
| `supabase/functions/bulk-import-mcqs/index.ts` | Add section resolution + save originals |


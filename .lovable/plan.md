
# Fix Concept Import, Confidence Tracking, and AI/Manual Display

## What Will Change

After this update:
- When you upload a CSV with `concept_key`/`concept_title` columns, the flashcards will be correctly linked to their concepts
- Admin tables will show whether a concept was assigned by AI or manually, plus the AI confidence percentage
- CSV exports will include concept_name
- The Auto-Align function will persist the AI confidence score to the database

## Technical Steps

### 1. Database Migration: Add `concept_ai_confidence` Column

Add `concept_ai_confidence NUMERIC NULL` to all 8 content tables:
- mcqs, essays, osce_questions, matching_questions, study_resources, flashcards, true_false_questions, lectures

### 2. Update TypeScript Interfaces

**File: `src/hooks/useStudyResources.ts`**
- Add `concept_id`, `concept_auto_assigned`, and `concept_ai_confidence` to `StudyResource` interface
- Add `concept_id`, `concept_auto_assigned`, `concept_ai_confidence` to `StudyResourceInsert` interface

### 3. Bulk Upload: Map Concept Columns from CSV

**File: `src/components/study/StudyBulkUploadModal.tsx`**

- Add `concept_key`, `concept_title`, `conceptkey`, `concepttitle`, `concept_name` to `buildHeaderMapping`
- Add `conceptKey` field to `ParsedItem` interface
- In `parseLineByType` for flashcards, read `concept_key` from the mapped column
- Accept a `concepts` prop: `{ id: string; concept_key: string; title: string }[]`
- In `handleImport`, resolve `conceptKey` to `concept_id` via `concepts.find(c => c.concept_key === row.conceptKey)`
- When matched: set `concept_id`, `concept_auto_assigned = false`, `concept_ai_confidence = null`
- Update `isHeaderLine` to also recognize `concept_key` / `concept_title`

**File: `src/components/study/FlashcardsTab.tsx`**
- Fetch concepts via `useChapterConcepts(chapterId)` and pass them to `StudyBulkUploadModal`

### 4. Admin Table: Show AI/Manual Badge + Confidence

**File: `src/components/admin/ContentAdminTable.tsx`**

Update the `concept` column rendering:
- Show concept name badge (existing)
- If `concept_auto_assigned === true`, show "AI" badge
- If `concept_auto_assigned === true` AND `concept_ai_confidence` is not null, show confidence percentage (e.g., "82%")
- If concept exists but `concept_auto_assigned === false`, show "Manual" text

**File: `src/components/study/FlashcardsAdminTable.tsx`**
- Include `concept_auto_assigned` and `concept_ai_confidence` in `FlashcardRow` interface
- Map these from `resource` in the rows transformation

### 5. CSV Export: Add Concept Name Column

**File: `src/lib/csvExport.ts`**
- Update `exportToCsv` to accept an optional `concepts` parameter
- Add `concept_name` column to `FLASHCARD_EXPORT_COLUMNS`, `MCQ_EXPORT_COLUMNS`, `ESSAY_EXPORT_COLUMNS`, `LECTURE_EXPORT_COLUMNS`
- The `getValue` function resolves `concept_id` to concept title

**All admin tables** (FlashcardsAdminTable, McqAdminTable, EssaysAdminTable, LecturesAdminTable, etc.):
- Pass concepts array to the `exportToCsv` call via updated `csvExportConfig`

### 6. Auto-Align Edge Function: Persist Confidence

**File: `supabase/functions/auto-align-concepts/index.ts`**

Update the row update to include `concept_ai_confidence`:
```text
.update({
  concept_id: conceptId,
  concept_auto_assigned: true,
  concept_ai_confidence: match.confidence,
})
```

### 7. Manual Override: Clear Confidence

All edit form modals (McqFormModal, TrueFalseFormModal, OsceFormModal, MatchingQuestionFormModal, StudyResourceFormModal):
- When saving with a manually-changed `concept_id`, also set `concept_ai_confidence: null`

## Files Summary

| File | Change |
|---|---|
| Migration SQL | Add `concept_ai_confidence` to 8 tables |
| `src/hooks/useStudyResources.ts` | Add concept fields to interfaces |
| `src/components/study/StudyBulkUploadModal.tsx` | Map concept columns from CSV, resolve to concept_id |
| `src/components/study/FlashcardsTab.tsx` | Pass concepts to bulk upload modal |
| `src/components/admin/ContentAdminTable.tsx` | Show AI/Manual badge + confidence % |
| `src/components/study/FlashcardsAdminTable.tsx` | Include concept tracking fields in rows |
| `src/lib/csvExport.ts` | Add concept_name to exports, accept concepts param |
| `supabase/functions/auto-align-concepts/index.ts` | Persist concept_ai_confidence |
| 5 edit form modals | Set concept_ai_confidence = null on manual change |

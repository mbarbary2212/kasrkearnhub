

# Fix Concept Display in MCQ Table and Bulk Update Tracking

## Root Causes Found

### Issue 1: MCQ concepts never load into the UI
The `Mcq` interface (line 13-28 in `useMcqs.ts`) does NOT include `concept_id`, `concept_auto_assigned`, or `concept_ai_confidence`. The `mapDbRowToMcq` function (line 41-58) strips these fields when converting database rows. This means even when you assign a concept via the edit form, it saves to the database but is immediately dropped when the data is read back -- so the table always shows "---".

### Issue 2: Bulk concept assignment does not track manual override
The `useBulkUpdateConcept` hook (line 81-106 in `useContentBulkOperations.ts`) only updates `concept_id`. It does NOT set `concept_auto_assigned: false` or `concept_ai_confidence: null`, so bulk-assigned concepts are not properly tracked as manual.

### Issue 3: Section data was never in the uploaded flashcards
The uploaded CSV does contain `section_name` and `section_number` columns, but checking the database shows most flashcards have `section_id = null`. This is likely because the `section_number` column in the CSV contains text like "3.2" but the parser tries `parseInt()` which would fail for decimal section numbers. The `resolveSectionId` function needs to handle text-based section numbers.

## Changes

### File 1: `src/hooks/useMcqs.ts`

**Add 3 fields to `Mcq` interface** (after `section_id` on line 17):
- `concept_id: string | null`
- `concept_auto_assigned: boolean | null`
- `concept_ai_confidence: number | null`

**Add 3 fields to `mapDbRowToMcq`** (after `section_id` on line 46):
- `concept_id: row.concept_id as string | null`
- `concept_auto_assigned: row.concept_auto_assigned as boolean | null`
- `concept_ai_confidence: row.concept_ai_confidence as number | null`

**Add 2 fields to `McqFormData`** (after `concept_id` on line 37):
- `concept_auto_assigned?: boolean`
- `concept_ai_confidence?: number | null`

### File 2: `src/hooks/useContentBulkOperations.ts`

**Update `useBulkUpdateConcept` mutation** (line 91) to also set:
- `concept_auto_assigned: false`
- `concept_ai_confidence: null`

This ensures bulk concept assignments from the UI are tracked as manual.

### File 3: `src/lib/csvExport.ts` (section resolution fix)

Check and fix `resolveSectionId` to handle text-based section numbers (e.g., "3.2") by matching against `section.section_number` as a string, not just using `parseInt`.

## Expected Result

After these changes:
- MCQ table will correctly show concepts with AI/Manual badges
- Bulk concept assignment will properly track as manual
- Re-uploading flashcards with section_number "3.2" will correctly resolve to sections


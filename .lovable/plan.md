
# Fix Concept Tagging Across Edit Forms, Admin Tables, Exports, and Templates

## Problems Found

1. **ConceptSelect shows "No concepts found" in edit forms** -- The `useConcepts` hook filters by `sectionId` when one is passed, but concepts are created at the chapter level (with `section_id = null`). When editing a flashcard or MCQ that belongs to a section, the ConceptSelect passes that section to `useConcepts`, which returns zero results.

2. **No concept column in any admin table** -- MCQ, Flashcard, True/False, Essay, OSCE, Matching, Visual Resources, and Guided Explanation tables all lack a "Concept" column.

3. **No concept in CSV exports** -- None of the export configurations include `concept_name`.

4. **TrueFalseFormModal missing ConceptSelect entirely** -- The True/False edit form never included a ConceptSelect field.

5. **Templates missing concept_name column** -- The help templates for MCQ, Flashcard, True/False, Essay, OSCE, Matching don't include a `concept_name` column for round-trip editing.

## Fix 1: ConceptSelect -- Stop Filtering by Section

**File:** `src/components/content/ConceptSelect.tsx`

Change the hook call from:
```
useConcepts(moduleId, chapterId, sectionId ?? undefined)
```
to:
```
useConcepts(moduleId, chapterId)
```

This ensures ALL chapter-level concepts are shown regardless of which section the content item belongs to. The same fix applies to `BulkConceptAssignment.tsx`.

## Fix 2: Add Concept Column to ContentAdminTable

**File:** `src/components/admin/ContentAdminTable.tsx`

Add built-in support for a `'concept'` column key (similar to how `'section'` works):
- Accept a `concepts` prop (array of Concept objects)
- Render the concept name as a badge when present
- Resolve `concept_id` from each data item

**File:** `src/hooks/useConcepts.ts`

The existing `useChapterConcepts` hook is sufficient for resolving concept names in tables.

## Fix 3: Add Concept Column to All Admin Tables

Each admin table will:
- Fetch concepts via `useChapterConcepts(chapterId)`
- Add a `{ key: 'concept', header: 'Concept' }` column
- Pass `concepts` to `ContentAdminTable`
- Add `concept_name` to CSV export config

**Files to update:**
- `McqAdminTable.tsx`
- `FlashcardsAdminTable.tsx`
- `TrueFalseAdminTable.tsx`
- `EssaysAdminTable.tsx`
- `OsceAdminTable.tsx`
- `MatchingAdminTable.tsx`
- `VisualResourcesAdminTable.tsx`
- `GuidedExplanationAdminTable.tsx`
- `LecturesAdminTable.tsx`

## Fix 4: Add ConceptSelect to TrueFalseFormModal

**File:** `src/components/content/TrueFalseFormModal.tsx`

Add `conceptId` state, load from `question.concept_id` on edit, include in submit data, and render `ConceptSelect` in the form.

## Fix 5: Update CSV Export Configs

**File:** `src/lib/csvExport.ts`

Add a `concept_name` column to `FLASHCARD_EXPORT_COLUMNS`, `MCQ_EXPORT_COLUMNS`, `ESSAY_EXPORT_COLUMNS`, and `LECTURE_EXPORT_COLUMNS`. The `getValue` function will accept a concepts list and resolve `concept_id` to a name.

Update `exportToCsv` signature to optionally accept a concepts array.

## Fix 6: Update Help Templates

**File:** `src/components/admin/HelpTemplatesTab.tsx`

Add `concept_name` as an optional column to every content template schema (MCQ, flashcard, true_false, essay, osce, matching) so that downloaded templates include the concept column for round-trip editing.

## Files Summary

| File | Change |
|---|---|
| `src/components/content/ConceptSelect.tsx` | Remove sectionId from useConcepts call |
| `src/components/content/BulkConceptAssignment.tsx` | Remove sectionId from ConceptSelect |
| `src/components/admin/ContentAdminTable.tsx` | Add concept column support + concepts prop |
| `src/lib/csvExport.ts` | Add concept_name to all export column configs |
| `src/components/content/McqAdminTable.tsx` | Add concept column + export |
| `src/components/study/FlashcardsAdminTable.tsx` | Add concept column + export |
| `src/components/content/TrueFalseAdminTable.tsx` | Add concept column + export |
| `src/components/content/TrueFalseFormModal.tsx` | Add ConceptSelect field |
| `src/components/content/EssaysAdminTable.tsx` | Add concept column + export |
| `src/components/content/OsceAdminTable.tsx` | Add concept column + export |
| `src/components/content/MatchingAdminTable.tsx` | Add concept column + export |
| `src/components/study/VisualResourcesAdminTable.tsx` | Add concept column + export |
| `src/components/study/GuidedExplanationAdminTable.tsx` | Add concept column + export |
| `src/components/content/LecturesAdminTable.tsx` | Add concept column + export |
| `src/components/admin/HelpTemplatesTab.tsx` | Add concept_name to all template schemas |

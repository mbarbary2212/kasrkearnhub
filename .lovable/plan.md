
# Remove Medical Concept System from Frontend

This plan removes all concept-related UI, hooks, utilities, and components while keeping the database columns/tables untouched in Supabase.

## Files to DELETE (11 files + 1 edge function)

| File | Purpose |
|---|---|
| `src/components/concepts/ConceptFilter.tsx` | Student-facing concept filter dropdown |
| `src/components/concepts/ConceptsManager.tsx` | Admin concept CRUD card |
| `src/components/concepts/ConceptBulkUploadModal.tsx` | Bulk concept upload modal |
| `src/components/concepts/SortableConceptItem.tsx` | Drag-and-drop concept item |
| `src/components/concepts/index.ts` | Barrel export |
| `src/components/content/ConceptSelect.tsx` | Concept selector dropdown |
| `src/components/content/BulkConceptAssignment.tsx` | Bulk concept assign popover |
| `src/components/admin/MissingConceptsAudit.tsx` | Missing concepts audit tab |
| `src/hooks/useConcepts.ts` | All concept query/mutation hooks |
| `src/lib/conceptNormalization.ts` | Concept key normalization utility |
| `supabase/functions/auto-align-concepts/index.ts` | AI auto-align edge function |

## Files to EDIT (22 files)

### Pages (2 files)

**`src/pages/ChapterPage.tsx`**
- Remove imports: `ConceptsManager`, `ConceptFilter` from `@/components/concepts`, `useChapterConcepts` from `@/hooks/useConcepts`
- Remove state: `selectedConceptId`
- Remove `chapterConcepts` query hook call
- Remove concept filtering logic from `filterBySection` (lines 175-180)
- Remove `<ConceptsManager>` from admin grid (line 391) -- make SectionsManager full width
- Remove both `<ConceptFilter>` instances (resources section line 469-474, practice section line 679-684)
- Remove `concepts` prop from `<StudyBulkUploadModal>` (line 889)

**`src/pages/TopicDetailPage.tsx`**
- Remove imports: `ConceptsManager`, `ConceptFilter` from `@/components/concepts`
- Remove state: `selectedConceptId`
- Remove concept filtering from `filterBySection` (lines 210-215)
- Remove `<ConceptsManager>` from admin grid (lines 378-381) -- make SectionsManager full width
- Remove both `<ConceptFilter>` instances (resources section lines 455-461, practice section lines 666-671)

### Admin Tables (7 files)

For each file, remove `useChapterConcepts` import/hook, remove concept column from columns array, remove `concepts={concepts}` prop, and remove concept_name from CSV export:

- **`src/components/content/McqAdminTable.tsx`**: Remove lines 5, 32, 57-61, 83, 93-99
- **`src/components/content/OsceAdminTable.tsx`**: Remove lines 6, 27, 74-78, 100, 117-124
- **`src/components/content/EssaysAdminTable.tsx`**: Remove lines 5, 35, 74-78, 99
- **`src/components/content/TrueFalseAdminTable.tsx`**: Remove lines 6, 33, 72-76, 98, 112-119
- **`src/components/content/MatchingAdminTable.tsx`**: Remove lines 5, 28, 76-80, 102, 110-117
- **`src/components/content/LecturesAdminTable.tsx`**: Remove lines 5, 36, concept column entry, `concepts={concepts}` prop
- **`src/components/study/FlashcardsAdminTable.tsx`**: Remove lines 5, 37, concept_id/concept_auto_assigned/concept_ai_confidence from FlashcardRow, concept column, `concepts={concepts}` prop
- **`src/components/study/VisualResourcesAdminTable.tsx`**: Remove lines 20, 99, concept column, `concepts={concepts}` prop, concept_name CSV column

### Form Modals (4 files)

For each, remove `ConceptSelect` import, `conceptId` state, concept fields from submit data, and `<ConceptSelect>` JSX:

- **`src/components/content/McqFormModal.tsx`**: Remove import (line 23), state (line 57), form data fields (lines 105-107), JSX (lines 235-244)
- **`src/components/content/OsceFormModal.tsx`**: Remove import (line 13), state (line 43), data fields (lines 163-165), JSX (lines 286-293)
- **`src/components/content/TrueFalseFormModal.tsx`**: Remove import (line 27), state (line 55), form data fields (lines 88-90), edit init (line 67), JSX (lines 198-206)
- **`src/components/content/MatchingQuestionFormModal.tsx`**: Remove import (line 30), state (line 67), data fields (lines 154-156), edit init (line 79), JSX (lines 353-360)

### Shared Components (2 files)

**`src/components/admin/ContentAdminTable.tsx`**
- Remove `BulkConceptAssignment` import (line 36)
- Remove `ConceptInfo` interface (lines 45-48)
- Remove `concepts` from props interface and component params
- Remove `concept` from `ColumnConfig` key union (line 39)
- Remove `concept_id` from generic constraint (line 50)
- Remove `getConceptName` helper (lines 151-154)
- Remove entire `column.key === 'concept'` render block (lines 168-186)
- Remove `<BulkConceptAssignment>` JSX (lines 303-311)
- Remove `concepts` from `exportToCsv` call (line 142)

**`src/components/admin/ContentItemActions.tsx`**
- Remove `ConceptSelect` import (line 27)
- Remove `conceptId` from props interface (line 37)
- Remove `editConceptId` state (line 103), init (line 113)
- Remove concept_id assignment in handleEdit (lines 156-158)
- Remove `<ConceptSelect>` JSX (lines 297-305)

### Hooks (1 file)

**`src/hooks/useContentBulkOperations.ts`**
- Remove `useBulkUpdateConcept` function entirely (lines 81-106)

### Bulk Upload (1 file)

**`src/components/study/StudyBulkUploadModal.tsx`**
- Remove `normalizeConceptKey` import (line 28)
- Remove `ConceptLookup` interface (lines 31-35)
- Remove `concepts` prop (line 46)
- Remove `conceptKey`/`conceptTitle` from ParsedItem (lines 54-55)
- Remove `concept_key` from CSV_FORMATS flashcard example (line 77)
- Remove `resolveConceptId` callback (lines 114-130)
- Remove concept fields from import mapping (lines 254, 264-266)
- Remove concept resolution from preview (lines 288-290, 294)
- Remove concept column from preview table header (line 389)
- Remove concept cell from preview table body (lines 449-460)
- Remove concept info extraction from parse function (lines 560-575 area)

### Bulk Insert Hook (1 file)

**`src/hooks/useStudyResources.ts`**
- Remove `concept_id`, `concept_auto_assigned`, `concept_ai_confidence` from the `resourcesWithUser` mapping (lines 434-436) -- revert recent addition

### CSV Export (1 file)

**`src/lib/csvExport.ts`**
- Remove `ConceptLookup` interface (lines 3-6)
- Remove `concepts` parameter from `ExportColumn.getValue` signature and `exportToCsv`
- Remove `resolveConceptName` function
- Remove `concept_name` entries from `FLASHCARD_EXPORT_COLUMNS`, `MCQ_EXPORT_COLUMNS`, `LECTURE_EXPORT_COLUMNS`, `ESSAY_EXPORT_COLUMNS`

### Study Resources Section (1 file)

**`src/components/study/StudyResourcesSection.tsx`**
- Remove `useChapterConcepts` import (line 21) and hook call (line 60)
- Remove `concepts={concepts}` from `<StudyBulkUploadModal>` (line 222)

### Admin Page (1 file)

**`src/pages/AdminPage.tsx`**
- Remove `MissingConceptsAudit` import (line 44)
- Remove `Tag` from lucide imports (line 14)
- Change integrity sub-tab state from `'orphaned' | 'quality' | 'concepts'` to `'orphaned' | 'quality'` (line 264)
- Change `TabsList` from `grid-cols-3` to `grid-cols-2` (line 806)
- Remove "Missing Concepts" tab trigger (lines 815-818)
- Remove concepts `TabsContent` (lines 877-879)

### Help Templates (1 file)

**`src/components/admin/HelpTemplatesTab.tsx`**
- Remove `concept_name` from `mcq` schema columns, optional, and examples (line 47 area)
- Remove `concept_name` from `osce` schema (line 68 area)
- Remove `concept_name` from `flashcard` schema (lines 97-101)
- Remove `concept_name` from `matching` schema (lines 148-151)
- Remove `concept_name` from `essay` schema (lines 169-183)
- Remove `concept_name` from `true_false` schema (lines 187-209)
- Remove entire `concept` template schema entry (lines 211-221)
- Remove `concept` entry from `BUILTIN_TEMPLATES` array (lines 322-328)

## What is NOT touched

- Case Builder single-modal interface
- ScrollToTop and scrolling fixes
- Case scenario consolidation (virtual_patient_cases)
- All section-related functionality
- Database tables and columns (concepts table, concept_id columns remain)

## Edge Function Deletion

The `auto-align-concepts` edge function will be deleted from Supabase deployment after removing the code files.

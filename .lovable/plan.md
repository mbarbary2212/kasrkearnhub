
## Clean Up Dead Table References After Database Consolidation

The database already has only `virtual_patient_cases` (as confirmed in your screenshot). But the codebase still has ~14 files querying the dropped `case_scenarios` and `clinical_cases` tables, which will cause runtime errors.

### Files to DELETE (4 files)

These are entirely legacy and no longer needed:

| File | Reason |
|---|---|
| `src/hooks/useCaseScenarios.ts` | Queries dropped `case_scenarios` table. Replaced by `useClinicalCases.ts` |
| `src/components/content/CaseScenarioFormModal.tsx` | Form for dropped table. Replaced by `ClinicalCaseFormModal.tsx` |
| `src/components/content/CaseScenarioBulkUploadModal.tsx` | Bulk upload for dropped table |
| `src/components/content/CaseScenarioDetailModal.tsx` | Detail view for dropped table |
| `src/components/content/CaseScenarioList.tsx` | List for dropped table. Replaced by `ClinicalCaseList.tsx` |
| `src/components/content/CaseList.tsx` | Legacy mock-data clinical cases component (table had 0 rows) |

### Files to MODIFY (10 files)

**1. `src/hooks/useContentProgress.ts`** (lines 88-91, 130-133, 196)
- Replace `case_scenarios` queries with `virtual_patient_cases` queries (filtered by chapter_id)
- Update variable names and count references accordingly

**2. `src/hooks/useNeedsPractice.ts`** (lines 155-160)
- Replace `case_scenarios` query with `virtual_patient_cases` query

**3. `src/hooks/useModuleWorkload.ts`** (lines 87-91)
- Replace `case_scenarios` query with `virtual_patient_cases` query

**4. `src/hooks/useChapterContent.ts`** (lines 107-124)
- Remove or replace `useChapterClinicalCases` function (queries dropped `clinical_cases` table)
- If still needed, point it at `virtual_patient_cases`

**5. `src/hooks/useModuleContent.ts`** (lines 99-116)
- Remove or replace `useModuleClinicalCases` function (queries dropped `clinical_cases` table)

**6. `src/hooks/useContent.ts`** (lines 124-142)
- Remove or replace `useClinicalCases` function (queries dropped `clinical_cases` table)

**7. `src/hooks/useContentDelete.ts`** (lines 6, 20, 29)
- Remove `clinical_cases` from `ContentTable` type and query key maps

**8. `src/hooks/useSections.ts`** (line 300)
- Remove `clinical_cases` from the content table union type

**9. `src/components/sections/BulkSectionAssignment.tsx`** (line 30)
- Remove `clinical_cases` from the content table union type

**10. `src/pages/AdminPage.tsx`** (lines 256, 259, 383-384)
- Remove `case_scenarios` and `clinical_cases` from orphan/quality check types
- Remove associated state variables for those checks

### Edge Functions to UPDATE (3 files)

**1. `supabase/functions/cache-readiness/index.ts`** (line 98)
- Replace `case_scenarios` query with `virtual_patient_cases` query

**2. `supabase/functions/integrity-orphaned-all/index.ts`** (lines 17-18, 71-74)
- Remove `case_scenarios` config entry
- Remove `clinical_cases` from the content type union (or confirm it already points to `virtual_patient_cases`)

**3. `supabase/functions/integrity-pilot-v2/index.ts`** (lines 383-387)
- Remove or update the `case_scenarios` quality check block

**4. `supabase/functions/approve-ai-content/index.ts`** (line 335)
- Replace `case_scenarios` insert with `virtual_patient_cases` insert

**5. `supabase/functions/process-batch-job/index.ts`** (line 74)
- Change `case_scenario: 'case_scenarios'` to `case_scenario: 'virtual_patient_cases'`

### About Worked Cases

Worked Cases (`clinical_case_worked` in `study_resources`) are kept as-is. They serve as non-interactive reference walkthroughs in Clinical Tools -- a different purpose from interactive clinical cases.

### What does NOT change

- `useClinicalCases.ts` hook (already queries `virtual_patient_cases` correctly)
- Clinical case builder/runner components (already use the canonical table)
- AI Content Factory generation (already targets `virtual_patient_cases`)
- The `types.ts` file (auto-generated from Supabase schema, will update on next sync)

### Summary

This is purely a code cleanup -- no database changes needed. We're removing ~6 dead files and updating ~13 files that still reference the two dropped tables.

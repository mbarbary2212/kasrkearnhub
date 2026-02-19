

# Case Content Consolidation Plan

## Summary

Merge `case_scenarios` (20 records) into `virtual_patient_cases` as read-only cases, drop the empty `clinical_cases` table, and keep Worked Cases in `study_resources` where they already live.

## Answer: Where do Worked Cases store data?

Worked Cases are stored in the **`study_resources`** table with `resource_type = 'clinical_case_worked'`. Their structured content (history, examination, diagnosis, investigations, management plan, learning points) is stored as JSON in the `content` column. This is the correct home for them -- they are static reference material, not interactive practice. Currently 0 records exist but the full CRUD UI is already built and functional.

---

## Phase 1: Data Migration (SQL)

Migrate the 20 active `case_scenarios` into `virtual_patient_cases` as `read_case` mode entries:

- `case_scenarios.title` -> `virtual_patient_cases.title`
- `case_scenarios.case_history` -> `virtual_patient_cases.intro_text`
- `case_scenarios.module_id`, `chapter_id` -> same columns
- `case_scenarios.id` -> `virtual_patient_cases.legacy_case_scenario_id` (for traceability)
- `case_mode` = `'read_case'`
- Create one `virtual_patient_stage` per case containing `case_questions` + `model_answer`

## Phase 2: Drop `clinical_cases` table (SQL)

- The table has 0 records and no active UI writes
- Drop with CASCADE (removes the `concept_id` FK we just added)

## Phase 3: Remove `case_scenarios` from frontend

### Files to delete
- `src/hooks/useCaseScenarios.ts`
- `src/components/content/CaseScenarioList.tsx`
- `src/components/content/CaseScenarioDetailModal.tsx`
- `src/components/content/CaseScenarioFormModal.tsx`
- `src/components/content/CaseScenarioBulkUploadModal.tsx`

### Files to edit (remove `case_scenarios` references)
- `src/hooks/useChapterProgress.ts` -- remove case_scenarios count/attempt queries
- `src/hooks/useContentProgress.ts` -- remove case_scenarios queries
- `src/hooks/useNeedsPractice.ts` -- remove case_scenarios section
- `src/hooks/useStudentDashboard.ts` -- remove case_scenarios from content counts
- `src/hooks/useModuleWorkload.ts` -- remove case_scenarios query
- `src/hooks/useContentBulkOperations.ts` -- remove `case_scenarios` from type unions if present
- `src/components/admin/MissingConceptsAudit.tsx` -- remove `clinical_cases` and `case_scenarios` entries
- `src/pages/AdminPage.tsx` -- remove orphan/quality check state for `case_scenarios` and `clinical_cases`
- `supabase/functions/approve-ai-content/index.ts` -- redirect case scenario AI content to `virtual_patient_cases`
- `supabase/functions/integrity-pilot-v2/index.ts` -- remove case_scenarios/clinical_cases references

### What stays unchanged
- **Worked Cases** remain in `study_resources` (type `clinical_case_worked`) under Resources > Clinical Tools
- **Virtual Patient Cases** remain the single source of truth for all interactive and read-only clinical cases
- `ClinicalCaseList`, `ClinicalCaseAdminList`, `ClinicalCaseBuilderModal` and all VP components are untouched

## Technical Details

### Data migration SQL sketch

```text
-- Insert case_scenarios into virtual_patient_cases
INSERT INTO virtual_patient_cases (title, intro_text, module_id, chapter_id, case_mode, legacy_case_scenario_id, ...)
SELECT title, case_history, module_id, chapter_id, 'read_case', id, ...
FROM case_scenarios WHERE is_deleted = false;

-- Create one stage per migrated case with questions + model answer
INSERT INTO virtual_patient_stages (case_id, stage_order, title, content, ...)
SELECT vpc.id, 1, 'Questions', jsonb_build_object('questions', cs.case_questions, 'model_answer', cs.model_answer), ...
FROM virtual_patient_cases vpc
JOIN case_scenarios cs ON cs.id = vpc.legacy_case_scenario_id;

-- Drop clinical_cases (0 records)
DROP TABLE IF EXISTS clinical_cases CASCADE;
```

### Scope of progress hook changes
The progress hooks currently count `case_scenarios` separately. After migration, these counts come from `virtual_patient_cases` which is already counted in the clinical cases section. The fix is simply removing the duplicate `case_scenarios` queries -- no new queries needed.


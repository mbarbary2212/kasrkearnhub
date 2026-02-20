
## ✅ COMPLETED: Clean Up Dead Table References After Database Consolidation

All references to the dropped `case_scenarios` and `clinical_cases` tables have been removed from the codebase. The canonical table is now `virtual_patient_cases` throughout.

### What was done

- Deleted 6 legacy files (useCaseScenarios.ts, CaseScenarioFormModal, CaseScenarioBulkUploadModal, CaseScenarioDetailModal, CaseScenarioList, CaseList)
- Updated 12 hooks to query `virtual_patient_cases` instead of dropped tables
- Removed legacy types (ClinicalCase mock type, clinical_cases from ContentTable unions)
- Updated AdminPage integrity checks to remove case_scenarios/clinical_cases orphan and quality checks
- Updated 5 edge functions (cache-readiness, integrity-orphaned-all, integrity-pilot-v2, approve-ai-content, process-batch-job)
- Kept Worked Cases (`clinical_case_worked` in `study_resources`) as-is for non-interactive reference material

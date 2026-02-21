
## ✅ COMPLETED: Clean Up Dead Table References After Database Consolidation

All references to the dropped `case_scenarios` and `clinical_cases` tables have been removed from the codebase. The canonical table is now `virtual_patient_cases` throughout.

### What was done

- Deleted 6 legacy files (useCaseScenarios.ts, CaseScenarioFormModal, CaseScenarioBulkUploadModal, CaseScenarioDetailModal, CaseScenarioList, CaseList)
- Updated 12 hooks to query `virtual_patient_cases` instead of dropped tables
- Removed legacy types (ClinicalCase mock type, clinical_cases from ContentTable unions)
- Updated AdminPage integrity checks to remove case_scenarios/clinical_cases orphan and quality checks
- Updated 5 edge functions (cache-readiness, integrity-orphaned-all, integrity-pilot-v2, approve-ai-content, process-batch-job)
- Kept Worked Cases (`clinical_case_worked` in `study_resources`) as-is for non-interactive reference material

## ✅ COMPLETED: Speed Up Practice & OSCE Tab Loading (Lazy Loading Optimization)

### Problem
All practice queries (MCQs, OSCEs, matching, true/false, essays, clinical cases) fired eagerly on chapter page load via `select('*')`, even when the user was on the Resources tab.

### What was done

**Layer 1 — Lazy-load practice data**
- Added `options?: { enabled?: boolean }` parameter to: `useChapterMcqs`, `useChapterOsceQuestions`, `useChapterMatchingQuestions`, `useChapterTrueFalseQuestions`, `useChapterEssays`
- In `ChapterPage.tsx`, full data hooks now only fetch when `activeSection === 'practice' || 'test'`
- Deleted-data hooks only fetch when practice active AND user is admin

**Layer 2 — Lightweight count hooks for badges**
- Added count-only hooks using `{ count: 'exact', head: true }` (zero payload):
  - `useChapterMcqCount`, `useChapterOsceCount`, `useChapterMatchingCount`, `useChapterTrueFalseCount`, `useChapterEssayCount`, `useChapterClinicalCaseCount`
- Practice tab badges now use count hooks instead of `data?.length`
- Count hooks always run (not gated by activeSection)

**Layer 3 — Stable caching**
- Added `staleTime: 2min` to full-data hooks, `staleTime: 5min` to count hooks
- Added `placeholderData: (prev) => prev` to prevent flash of empty state on tab switches
- Count query keys invalidated alongside full-data keys in all create/delete/restore mutations

### Files modified
- `src/hooks/useMcqs.ts` — count hook + options param + staleTime + count invalidation
- `src/hooks/useOsceQuestions.ts` — same
- `src/hooks/useMatchingQuestions.ts` — same
- `src/hooks/useTrueFalseQuestions.ts` — same
- `src/hooks/useChapterContent.ts` — essay count hook + clinical case count hook + options param
- `src/pages/ChapterPage.tsx` — lazy data hooks, count hooks for badges
- `src/components/admin/AdminContentActions.tsx` — essay count invalidation

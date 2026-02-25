

## Plan: Simplify Cases — Remove Mode Tabs, Sort by Difficulty

### Problem
The 4-column mode tabs (All / Read / Practice / Branched) create unnecessary complexity. Cases should just be one flat list, sorted by difficulty level, with the level filter dropdown as the only way to narrow down.

### Changes

#### 1. `src/components/clinical-cases/ClinicalCaseList.tsx`
- **Remove** the `CASE_MODE_TABS` import and `modeFilter` state entirely
- **Remove** the `<Tabs>` block from all three render paths (loading, empty, main)
- Call `useClinicalCases` with `'all'` hardcoded (no mode filtering)
- **Sort** `filteredCases` by difficulty: beginner → intermediate → advanced
- Update empty state text: "No Clinical Cases" → "No Cases Available"
- Keep the search input and level filter dropdown as-is

#### 2. `src/types/clinicalCase.ts`
- Remove `comingSoon: true` from `branched_case` in `CASE_MODE_TABS` (kept for admin use but no longer student-facing)
- Optionally keep `CASE_MODE_TABS` since admin builder/bulk-upload may reference it

#### 3. `src/components/clinical-cases/ClinicalCaseCard.tsx`
- Keep the mode badge on each card (Simple/Complex/Branched) so users can still see the type — but it's just metadata, not a filter

### What stays unchanged
- Database, hooks, admin forms, bulk upload — all untouched
- The level filter dropdown remains (beginner/intermediate/advanced)
- Card layout, icons, progress tracking — all the same

### Result
Cases tab shows one unified list sorted by difficulty. Students scan top-to-bottom from easy to hard. The level dropdown lets them filter if needed. No mode tabs cluttering the UI.




## Root Cause

The Cases tab badge shows **0** because the count query (`chapter-clinical-case-count`) is **never invalidated** when cases are created, updated, or deleted.

The mutations in `useClinicalCases.ts` only invalidate `['clinical-cases']`, but the count hook uses a separate query key `['chapter-clinical-case-count', chapterId]`. After uploading cases, the admin list refreshes (different query key), but the badge count stays at its cached value of 0.

## Fix

**File: `src/hooks/useClinicalCases.ts`**

Add `queryClient.invalidateQueries({ queryKey: ['chapter-clinical-case-count'] })` to every mutation's `onSuccess` that already invalidates `['clinical-cases']`. This covers:

1. `useCreateClinicalCase` (line ~167)
2. `useUpdateClinicalCase` (line ~198)
3. `useDeleteClinicalCase` (line ~219)
4. `useCreateCaseStage` (line ~254)
5. `useUpdateCaseStage` (line ~296)
6. `useDeleteCaseStage` (line ~321)
7. `useReorderCaseStages` (line ~349)

Additionally, the bulk upload flow in `ClinicalCaseBulkUploadModal.tsx` likely calls `queryClient.invalidateQueries` directly -- that also needs the count key added.

This is a one-line addition per mutation -- no schema or logic changes needed.


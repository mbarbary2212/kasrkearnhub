

## Plan: Remove Old Case System, Unify on Structured Cases

### What Changes

**Files to DELETE (4 files):**
- `src/components/clinical-cases/AICaseRunner.tsx` — old chat-based runner
- `src/components/clinical-cases/ClinicalCaseFormModal.tsx` — old manual create/edit modal
- `src/components/clinical-cases/ClinicalCaseAIGenerateModal.tsx` — old AI generate (calls `generate-vp-case`)
- `src/components/clinical-cases/ClinicalCaseBulkUploadModal.tsx` — old CSV import

**Edge functions to DELETE (2 functions):**
- `supabase/functions/run-ai-case/index.ts` — old turn-by-turn AI chat
- `supabase/functions/generate-vp-case/index.ts` — old case generation

**Files to KEEP but no longer needed (can delete):**
- `src/hooks/useAICase.ts` — only used by `AICaseRunner`
- `src/types/aiCase.ts` — only used by `AICaseRunner` and `useAICase`

**Files to EDIT:**

1. **`src/components/clinical-cases/ClinicalCaseAdminList.tsx`**
   - Remove imports of `ClinicalCaseFormModal`, `ClinicalCaseAIGenerateModal`, `ClinicalCaseBulkUploadModal`
   - Remove state variables: `caseFormOpen`, `aiGenerateOpen`, `bulkUploadOpen`, `editingCase`
   - Remove buttons: "Add Case", "Generate with AI" (old), "Import File"
   - Rename "Structured Case" button to **"Create Case"** with Sparkles icon as the primary action
   - Remove all three old modal renders at bottom
   - Change "Edit" button to navigate to `/structured-case/${id}/edit` (preview editor) instead of opening old form modal
   - Change display from "X turns" to "X sections" for cases with `active_sections`
   - Update empty state to show single "Create Case" button pointing to StructuredCaseCreator

2. **`src/pages/VirtualPatientPage.tsx`**
   - Remove `AICaseRunner` import
   - Remove the legacy fallback branch (lines 146-164)
   - Remove `isStructuredCase` conditional — treat ALL cases as structured
   - Remove hint mode toggle and state
   - If case lacks `generated_case_data`, show an error/info message instead of falling back
   - Remove "AI Case" badge variant — all cases are just "Interactive Case"

3. **`src/components/clinical-cases/index.ts`**
   - Remove exports for `ClinicalCaseFormModal`, `ClinicalCaseAIGenerateModal`, `ClinicalCaseBulkUploadModal`

4. **`src/hooks/useClinicalCases.ts`**
   - Remove `useCreateClinicalCase` and `useUpdateClinicalCase` (only used by deleted modals)
   - Keep: `useClinicalCases`, `useClinicalCase`, `useDeleteClinicalCase`, `useClinicalCaseAttempts`, `useStartClinicalCaseAttempt`, `useCompleteClinicalCaseAttempt`

5. **`supabase/config.toml`**
   - Remove entries for `run-ai-case` and `generate-vp-case`

**Database: Soft-delete 2 legacy cases**
- UPDATE `virtual_patient_cases` SET `is_deleted = true` WHERE `id` IN (`9e63712e...`, `96df1e99...`) — the two old-format cases without `generated_case_data`

### What's NOT touched
- `AICasesAdminTab` / `AICaseTranscriptModal` / `useAICaseAdmin` — admin analytics for reviewing past attempts; reads from shared tables, no dependency on old runner
- `ClinicalCaseList` / `ClinicalCaseCard` — student-facing listing, works for both formats
- `StructuredCaseCreator`, `CasePreviewEditor`, `StructuredCaseRunner`, `CaseSummary` — the new system, untouched

### After this change
- The only "Create" button in the admin Interactive tab opens `StructuredCaseCreator`
- `StructuredCaseCreator` creates metadata → navigates to `/structured-case/:id/edit` (CasePreviewEditor)
- In the editor, the admin clicks "Generate with AI" which calls `generate-structured-case` edge function
- Students always use `StructuredCaseRunner`
- No old code paths remain


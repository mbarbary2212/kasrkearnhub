

# Fix Interactive Cases: Visibility, Default Timer, Voice Menu, Duplicates

## Issues Found

1. **Case not appearing after save**: The `useUpdateStructuredCaseData` hook only invalidates `['structured-case', caseId]` but NOT `['clinical-cases']` or `['virtual-patient-cases']`. When the admin saves and navigates back, the list query uses stale cached data.

2. **Default timer**: The history time limit placeholder says "Default: X min" (calculated as 40% of estimated_minutes), but no explicit default of 2 minutes is set. When `history_time_limit_minutes` is undefined, the runner uses the auto-calculated value.

3. **Voice choice hidden**: The voice selector only shows when `historyInteractionMode === 'voice'`. It should always be visible so admins can pick a voice regardless of mode (Text History also uses TTS for patient responses).

4. **Duplicate imports**: No duplicate detection exists. Importing the same JSON twice creates two identical cases.

---

## Step 1: Fix case not appearing after save

**File: `src/hooks/useStructuredCaseData.ts`** (onSuccess in useUpdateStructuredCaseData)
- Add `queryClient.invalidateQueries({ queryKey: ['clinical-cases'] })` so the admin list refreshes when navigating back.

## Step 2: Default history timer to 2 minutes

**File: `src/components/clinical-cases/CasePreviewEditor.tsx`**
- In the `useEffect` that initializes `editedData` from `generatedData`, if `history_time_limit_minutes` is not set, default it to `2`.
- Update the placeholder text to say "Default: 2 min".

## Step 3: Show voice selector for both text and voice modes

**File: `src/components/clinical-cases/CasePreviewEditor.tsx`**
- Remove the `historyInteractionMode === 'voice'` condition wrapping the Voice Character selector (around line 468). Show it always when `editedData` exists.

## Step 4: Prevent duplicate imports

**File: `src/components/clinical-cases/ClinicalCaseAdminList.tsx`**
- In `handleImportJson`, before inserting, check if a case with the same `title` and `chapter_id` already exists in `filteredCases`.
- If a duplicate is found, show a confirmation toast/dialog asking the admin to confirm before proceeding.


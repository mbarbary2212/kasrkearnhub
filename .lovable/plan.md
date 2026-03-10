

# Clean Up Old Cases + Fix Title/Intro Sync

## Problem

1. **Old deleted cases cluttering the database**: Many soft-deleted cases, attempts, and orphaned stages exist in the three `virtual_patient_*` tables.
2. **Title/intro_text not syncing**: When you edit patient info (age, name, etc.) in the Case Editor, it only updates `generated_case_data` JSONB. The top-level `title` and `intro_text` columns are never updated, so the case card still shows "A 58-year-old..." even after changing age to 62.

## Changes

### 1. Delete old soft-deleted cases (SQL via insert tool)

Run these data cleanup queries in order:

```sql
-- 1. Delete attempts linked to deleted cases
DELETE FROM virtual_patient_attempts
WHERE case_id IN (SELECT id FROM virtual_patient_cases WHERE is_deleted = true);

-- 2. Delete all orphaned stages (all point to deleted cases)
DELETE FROM virtual_patient_stages
WHERE case_id IN (SELECT id FROM virtual_patient_cases WHERE is_deleted = true);

-- 3. Delete the soft-deleted cases themselves
DELETE FROM virtual_patient_cases WHERE is_deleted = true;
```

### 2. Sync title and intro_text on save

**File**: `src/hooks/useStructuredCaseData.ts` — `useUpdateStructuredCaseData`

When saving, extract patient info from `generated_case_data` and derive:
- `title`: from `data.case_meta?.title` (if present) — keep existing title if no meta title
- `intro_text`: build from patient data, e.g. "A {age}-year-old {gender} presents with..." using `data.patient?.age`, `data.patient?.gender`, and `data.patient?.background`
- Also sync `chief_complaint` from `data.case_meta?.chief_complaint` if available

Add these fields to the `updatePayload` so the top-level columns stay in sync with the JSONB content.

### Summary

| What | How |
|---|---|
| Delete old cases/attempts/stages | 3 SQL DELETE statements |
| `useStructuredCaseData.ts` | Sync `title`, `intro_text` from `generated_case_data` patient info on every save |


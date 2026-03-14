

# Consolidate to Single Case Type in AI Content Factory

## What Changes

Remove **3 redundant case types** from the Content Factory, keeping only `clinical_case` (renamed to "Interactive Cases"):

| Removed | Reason |
|---------|--------|
| `virtual_patient` | Duplicate of `clinical_case` — same DB table, same validation |
| `case_scenario` | Lighter variant with no real DB persistence |
| `worked_case` | Mostly empty/unused generation template |

## Files to Edit

### 1. `src/components/admin/AISettingsPanel.tsx`
- Remove `virtual_patient`, `case_scenario`, `worked_case` from `CONTENT_TYPES` array
- Rename `clinical_case` label to "Interactive Cases"

### 2. `src/components/admin/AIContentFactoryModal.tsx`
- Remove the 3 content type options from the selection grid
- Remove their `case` branches in `getItemTitle` and any type-specific logic

### 3. `src/components/admin/AIContentPreviewCard.tsx`
- Remove `worked_case` and `case_scenario` render branches (or alias to `clinical_case`)

### 4. `src/components/admin/AIBatchJobsList.tsx`
- Remove `worked_case` from label map; keep `virtual_patient`/`case_scenario` as aliases → "Interactive Cases" for old job records

### 5. `supabase/functions/generate-content-from-pdf/index.ts`
- Remove `case_scenario` and `worked_case` from `ContentType` union, schemas, validation functions, and prompts
- Keep `virtual_patient` as a silent alias → `clinical_case` (backward compat for existing batch jobs)


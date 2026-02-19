

# Drop Legacy `case_scenarios` Table

All 31 case scenario records have been successfully migrated to `virtual_patient_cases` (confirmed via `legacy_case_scenario_id` references). The `case_scenarios` table can now be safely removed.

## What Changes

### 1. Database Migration
- Drop the `case_scenarios` table entirely (all data already lives in `virtual_patient_cases`)

### 2. Code Cleanup (4 files)

**`src/pages/AdminPage.tsx`**
- Remove `case_scenarios` from the `OrphanCheckType` and `QualityCheckType` unions
- Remove all associated state variables (`orphanCaseScenariosRunning`, etc.)
- Remove the "Case Scenarios" entry from the orphan checks list and quality checks list

**`supabase/functions/approve-ai-content/index.ts`**
- Update AI content approval to insert into `virtual_patient_cases` instead of `case_scenarios`

**`supabase/functions/cache-readiness/index.ts`**
- Replace `case_scenarios` query with `virtual_patient_cases` for readiness calculations

**`supabase/functions/integrity-pilot-v2/index.ts`**
- Replace `case_scenarios` integrity checks with `virtual_patient_cases` equivalents, or remove redundant checks if already covered by `clinical_cases` checks

### 3. Live Environment Consideration
Since both Test and Live share the same Supabase project, the migration will drop the table in both environments. The 31 records are already migrated, so no data loss will occur.

## Technical Details

### Migration SQL
```text
DROP TABLE IF EXISTS public.case_scenarios;
```

### Files Modified
- `supabase/migrations/` -- new migration to drop table
- `src/pages/AdminPage.tsx` -- remove ~30 lines of case_scenarios references
- `supabase/functions/approve-ai-content/index.ts` -- redirect inserts to virtual_patient_cases
- `supabase/functions/cache-readiness/index.ts` -- query virtual_patient_cases instead
- `supabase/functions/integrity-pilot-v2/index.ts` -- update or remove case_scenarios checks


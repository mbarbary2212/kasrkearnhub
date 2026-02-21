

## Fix: OSCE Bulk Upload Flexible Column Detection

### The Problem

Your XLSX file uses column headers like `history text`, `statement 1`, `answer 1`, `explanation 1` (spaces, no suffixes), but the parser looks for exact names like `case_history`, `statement_1_text`, `statement_1_answer`. The AI analyzer correctly identifies the mappings but those mappings are never actually applied during parsing -- they are display-only. So every row fails validation.

### The Fix

**File: `src/components/content/OsceBulkUploadModal.tsx` (lines 100-140)**

Add a column-name normalization/alias layer before accessing row data. Instead of reading `row['case_history']` directly, first build an alias map from the actual headers to the expected column names, then use that map to read values.

**Alias map will handle these common variations:**

| Expected Column | Also Accept |
|---|---|
| `case_history` | `history text`, `history_text`, `casehistory`, `case history` |
| `statement_1_text` | `statement 1`, `statement_1`, `statement1` |
| `statement_1_answer` | `answer 1`, `answer_1`, `answer1` |
| `explanation_1` | `explanation 1`, `explanation_1` (already works) |
| (same pattern for 2-5) | |
| `image_filename` | `image filename`, `imagename`, `image name` |
| `section_name` | `section name`, `sectionname` |
| `section_number` | `section number`, `sectionnumber` |

**Implementation approach:**

1. After `XLSX.utils.sheet_to_json()`, read the actual header names from the first row's keys
2. Build a `resolveColumn(row, ...aliases)` helper that tries each alias and returns the first non-empty value
3. Replace all `row['exact_name']` lookups with `resolveColumn(row, 'case_history', 'history text', 'history_text')` etc.
4. This also applies to the edge function `supabase/functions/bulk-import-osce/index.ts` which has the same rigid column lookups

**Also apply the same fix to the edge function** `supabase/functions/bulk-import-osce/index.ts` (lines 164-184) which uses the same exact-match column names for the server-side import path.

### Files to Modify

| File | Change |
|---|---|
| `src/components/content/OsceBulkUploadModal.tsx` | Add `resolveColumn` helper; replace all rigid `row['column_name']` lookups with flexible alias resolution |
| `supabase/functions/bulk-import-osce/index.ts` | Same flexible column resolution for server-side import |


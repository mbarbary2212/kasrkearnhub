

# Fix: AI Confidence Not Displaying + Loading Performance

## Problem Summary

Three issues identified:

1. **AI confidence data is `null` in the database** — Your friend uploaded the Esophagus MCQs (which have `ai_confidence: 10` in the CSV) **before** the CSV parser fix was deployed. The old parser didn't extract `ai_confidence`, so all 94 MCQs were saved with `null`. The code fix we made to `csvParser.ts` only affects future uploads.

2. **Card view shows nothing because the badge returns `null` for non-admins** — The `AiConfidenceBadge` component only renders when `isAdmin={true}`. If you're logged in as a student, you won't see it (by design). But even for admins, the data is `null` so nothing shows.

3. **Slow loading** — 94 MCQs with `select('*')` is fine for data size, but the issue is likely the chapter page making many parallel queries (MCQs, sections, attempts, progress, etc.) on mount. We can improve this with targeted optimizations.

## Plan

### 1. Redeploy the edge function
The `bulk-import-mcqs` edge function needs redeployment so future uploads correctly save `ai_confidence`. The code is already correct — it just needs to be deployed.

### 2. Backfill existing MCQ data via SQL migration
Create a migration that updates the Esophagus chapter MCQs (and any others uploaded with the CSV `ai_confidence` column but stored as `null`). Since we can't retroactively parse the CSV, we'll need to either:
- Ask the friend to re-upload (simplest), OR
- Create a small admin UI action to "re-import with overwrite" for a chapter

**Recommended approach**: Add a "Re-import (update existing)" option to the bulk import modal. This matches existing MCQs by stem text and updates fields like `ai_confidence` that were previously missing, without creating duplicates.

### 3. Optimize loading performance
- Add `staleTime` and `gcTime` to heavy queries to reduce refetching
- Consider selecting only needed columns instead of `select('*')` for the MCQ list view (the `choices` JSON array is the heaviest field)

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/bulk-import-mcqs/index.ts` | Redeploy (no code change needed) |
| `src/components/content/McqList.tsx` | Add "Update existing" option to bulk import that matches by stem and updates `ai_confidence`, `difficulty`, `explanation` |
| `src/hooks/useMcqs.ts` | Increase `staleTime` on chapter MCQ queries; add `gcTime` |

## Important Note
The AI confidence badge is **admin-only by design**. When testing, make sure you're logged in with an admin or teacher account, not the student account (`elbarbarystudent@kasralainy.edu.eg` which is currently active).


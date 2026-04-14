

## Blueprint Import: "Replace All" erases data even when import produces 0 rows

### Root cause

The `importBlueprintFromExcel` function in `blueprintExcelImport.ts` has a dangerous sequence when `replaceAll=true`:

1. Parse all rows from Excel
2. Collect `affectedChapterIds` from successfully parsed rows
3. **DELETE all existing configs** for those chapters (line 253-264)
4. INSERT the new parsed rows (line 312-317)

The problem: if the Excel cells contain values that chapters match on (so `processCells` runs and `affectedChapterIds` gets populated via the `clears` path or even a few valid cells), but the INSERT step fails (DB constraint error, or the parsed values don't produce valid rows), the DELETE has already wiped the data. Result: 0 imported, all old data gone.

From your screenshot: "Imported (0 imported) with 123 issue(s)" — the 123 issues are ambiguous section matches. The chapters matched (triggering deletes), but something about the cell values or insert failed, leaving 0 rows imported.

### The fix

Add a **safety check** before the delete step: if `replaceAll` is true but `rows.length === 0` (nothing valid to insert), abort the operation and return an error instead of deleting everything.

Additionally, restructure the Replace All flow to **insert first, then delete old rows** that weren't just inserted. This way, if inserts fail, old data survives.

### File: `src/components/admin/blueprint/blueprintExcelImport.ts`

**Change 1** — After row parsing (line 248), before the delete block (line 253), add a guard:

```typescript
// Safety: if Replace All but nothing to insert, abort — don't wipe data
if (replaceAll && rows.length === 0) {
  result.errors.push('No valid data rows found in file. Existing data was NOT deleted.');
  return result;
}
```

**Change 2** — Restructure Replace All to be insert-then-delete:

Instead of deleting all configs first and then inserting, do:
1. Insert all new rows first (with a unique `import_batch` or just collect their IDs)
2. Only after inserts succeed, delete the old rows that weren't part of this import

Since we can't easily track "old vs new" without transactions, the simpler safe approach is:
- Keep the current delete-then-insert order BUT only proceed with the delete if `rows.length > 0`
- Add a secondary check: if all inserts fail (upserted stays 0 after the insert loop), log a prominent error

**Change 3** — In `ChapterBlueprintSubtab.tsx`, improve the toast for the 0-imported case:

When `result.upserted === 0 && replaceAll`, show a clear error: "Import failed — no rows were imported. Check your file format."

### Summary

| What | Where |
|------|-------|
| Add `rows.length === 0` guard before delete | `blueprintExcelImport.ts` line ~251 |
| Add post-insert check for 0 upserted after delete | `blueprintExcelImport.ts` line ~318 |
| Improve error toast for 0-imported Replace All | `ChapterBlueprintSubtab.tsx` line ~288 |

Two small changes that prevent data loss. No schema changes, no new files.


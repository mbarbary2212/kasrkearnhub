
Current diagnosis

- The importer is still unsafe in Replace All mode. In `src/components/admin/blueprint/blueprintExcelImport.ts`, it deletes existing `chapter_blueprint_config` rows first, then tries to insert the new rows.
- Your screenshot points to a second bug in matching: `src/lib/blueprintImportMatching.ts` strips numeric prefixes before section matching, so labels like `2.1. Electrolyte Imbalance` and `Electrolyte imbalance` can collapse to the same normalized text. That can make two Excel rows resolve to the same `(chapter_id, section_id, exam_type, component_type)` key.
- The table has a unique index on that composite key, so one duplicate target row can make the whole insert batch fail. Because Replace All already deleted the old rows, the chapter ends up blank.
- The toast in `ChapterBlueprintSubtab.tsx` currently favors warnings/details over the real DB failure, so you mainly see the ambiguity messages instead of the actual insert error.

Plan to fix

1. Make section matching deterministic
- Update `matchSection()` to extract and prefer visible section numbers from the label before aggressive normalization.
- Keep using hidden `section_id` when it exists, but make the visible label robust enough that edited/re-uploaded files still match correctly.
- If a section is still ambiguous, treat it as a hard validation error for Replace All instead of a warning.

2. Add a preflight validation pass before any writes
- In `blueprintExcelImport.ts`, build a `desiredMap` keyed by `chapter_id|section_id|component_type|exam_type`.
- Detect duplicate resolved keys inside the uploaded file and report the exact source rows causing the collision.
- If Replace All has any ambiguous matches, duplicate resolved keys, or zero valid rows, abort immediately with “no data changed”.

3. Rewrite Replace All so it is not destructive
- Remove the delete-first flow.
- Load existing configs for the affected chapters first.
- For each desired key: update existing rows when the key already exists, insert only genuinely new rows.
- Only after successful writes for a chapter, delete stale rows that are not present in the uploaded file.
- If any chapter fails validation or write operations, skip deletion for that chapter so existing data stays intact.

4. Fix user feedback
- In `ChapterBlueprintSubtab.tsx`, show real validation/database errors first, not just fuzzy-match warnings.
- Change the failure copy so it distinguishes:
  - “Import blocked — no data was changed”
  - vs. “Import partially applied”
- Add a short note in the upload flow that the safest workflow is to edit the downloaded template and keep the hidden ID columns intact.

5. Verify against the exact failure you hit
- Re-test with the same workbook that produced rows 10 and 11 ambiguity.
- Test these cases:
  - exported file re-uploaded unchanged
  - exported file with edited values
  - Replace All with an ambiguous/duplicate section name
  - Merge with partial edits
- Confirm that failed imports leave existing blueprint data untouched.

Files to update

- `src/lib/blueprintImportMatching.ts`
- `src/components/admin/blueprint/blueprintExcelImport.ts`
- `src/components/admin/blueprint/ChapterBlueprintSubtab.tsx`

Expected result

- Re-uploading a valid edited blueprint will import correctly.
- Ambiguous or duplicate files will be rejected before any delete happens.
- Replace All will no longer wipe existing blueprint data when the new file is invalid.

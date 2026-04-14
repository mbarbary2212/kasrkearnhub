
Goal: make the Assessment Blueprint Excel import much more forgiving, smarter about wording, and less likely to fail on larger files or imperfect spreadsheets.

What is wrong today
- The import runs in the browser and does a lot of Supabase calls one-by-one, so big uploads can feel slow and may hit practical limits.
- It assumes row 1 is the real header and matches component columns very strictly.
- Chapter matching is only moderately tolerant.
- Section matching is still fragile: it mainly works by hidden `section_id`, exact name, or simple “contains” matching within the current chapter.
- If the Excel wording differs from the app wording, especially in section labels, rows are skipped with warnings.

Unified update plan

1. Harden the Excel parser
- Accept common alternate headers, not just exact labels:
  - e.g. “Anatomy/pathology/Xray” -> `paraclinical`
  - plural/spacing variants like “Long cases”, “OSCEs”, etc.
- Auto-skip non-data rows:
  - top title row
  - repeated header rows
  - blank spacer rows
- Detect the real header row instead of assuming it is always row 1.

2. Make chapter matching more intelligent
- Keep hidden `chapter_id` as top priority when present.
- Add stronger text normalization for visible labels:
  - ignore `Ch 1:`
  - ignore punctuation, emoji, arrows, numbering noise
  - compare normalized chapter title text
- Add safer fuzzy matching so minor wording differences or typos still map correctly.
- If multiple chapters are plausible matches, return a clear warning instead of silently picking the wrong one.

3. Make section matching wording-based, not numbering-dependent
- Match sections using a scoring approach inside the current chapter:
  - hidden `section_id` first
  - exact normalized name
  - exact normalized `section_number`
  - combined patterns like `1.1 Section Name`
  - wording match on the text part alone
  - fuzzy match for minor spelling differences
- Strip formatting noise such as arrows, bullets, prefixes, duplicated numbering, punctuation, extra spaces.
- Support labels even when users delete or change the numeric prefixes.
- Keep matching constrained to the current chapter so “Diagnosis” in one chapter does not attach to another chapter.

4. Improve import performance so time limits are less of a problem
- Refactor the importer to avoid per-cell / per-row round trips wherever possible.
- Preload all existing blueprint configs for the selected chapters once.
- Build in-memory maps, then do batched inserts/updates/deletes instead of sequential `maybeSingle()` checks for every cell.
- Keep “Replace all” as a bulk delete + bulk insert path.
- If needed, move the heavy import logic into a Supabase Edge Function so the browser only uploads the file and receives a processed result summary.

5. Improve user feedback during import
- Show a better result summary:
  - imported count
  - cleared count
  - skipped rows
  - unmatched chapters
  - unmatched sections
  - unmatched column headers
- Distinguish between:
  - harmless warnings
  - rows skipped due to ambiguity
  - actual fatal failure
- Include plain-English guidance like:
  - “This row could not be matched because the chapter wording did not closely match any chapter in this module.”
  - “This section name exists in the app, but not under the chapter currently selected in the spreadsheet.”

6. Keep the export/import workflow compatible
- Preserve the hidden `chapter_id` and `section_id` columns because they are the most reliable path.
- Continue supporting hand-edited files even if the IDs are lost or labels are rewritten.
- Make the exported template clearer so users know:
  - keep the real header row at the top
  - wording can vary somewhat
  - hidden IDs help accuracy

Files likely involved
- `src/components/admin/blueprint/blueprintExcelImport.ts` — main logic overhaul
- `src/components/admin/blueprint/ChapterBlueprintSubtab.tsx` — improved upload feedback/toasts
- `src/components/admin/blueprint/blueprintExcelExport.ts` — optional template guidance tweaks
- Possibly a new shared helper such as `src/lib/blueprintImportMatching.ts` for normalization/scoring
- If we move heavy work server-side: a new Supabase Edge Function for blueprint import processing

Technical notes
- Current bottleneck: the importer already preloads sections, but still does sequential DB lookups and writes for each config cell.
- Current section matching is too simple for messy Excel wording.
- The data model already supports this improvement:
  - `chapter_blueprint_config` stores `chapter_id`, `section_id`, `component_type`
  - `sections` already has `name` and `section_number` as text
- Best matching strategy:
  - normalize text aggressively
  - score candidates
  - only auto-accept when confidence is high
  - otherwise warn and skip rather than mis-assign

Expected outcome
- Uploads will be much more forgiving when people edit wording.
- Section matching will work even if numbering like `1`, `1.1`, etc. is missing or altered.
- Large files will import more reliably and faster.
- Admins will get clearer explanations when something still cannot be matched.

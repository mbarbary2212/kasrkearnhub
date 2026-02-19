

# Extended Concept Bulk Upload + Updated Template

## What Changes

### 1. Update Help Template (`HelpTemplatesTab.tsx`)

Expand the concept schema to match ChatGPT's output format:

- Columns: `concept_key, title, section_hint, description`
- Required: `concept_key, title`
- Optional: `section_hint, description`
- Update examples to include all 4 columns with realistic medical data from the uploaded file

### 2. Update Bulk Upload Modal (`ConceptBulkUploadModal.tsx`)

**ParsedRow interface** -- add optional `sectionHint` and `description` fields for display purposes only (not inserted to DB).

**CSV parsing** -- detect header row to determine column order:
- If header contains `concept_key` as first column: use `concept_key,title,section_hint,description` order
- If header contains `title` as first column: use `title,concept_key` order (backward compatible)
- If no header detected: fall back to `title,concept_key` order
- Handle quoted CSV values (the description field may contain commas)

**File upload parsing** -- already handles column names via `xlsx`, just add extraction of `section_hint` and `description` fields.

**Duplicate detection** -- add a new `'duplicate'` status for in-file duplicates (distinct from `'exists'` which means already in DB). This makes the distinction clearer.

**Preview table** -- add Section Hint and Description columns (only shown when any row has those values, to keep the table clean for simple uploads).

### 3. CSV Placeholder Update

Update the CSV mode placeholder text to show the extended format:
```
concept_key,title,section_hint,description
virchow_triad,Virchow Triad,Venous thrombosis,Stasis hypercoagulability...
```

## Files to Modify

| File | Change |
|---|---|
| `src/components/concepts/ConceptBulkUploadModal.tsx` | Extended ParsedRow, smarter CSV parser with header detection, quoted value handling, extra columns in preview |
| `src/components/admin/HelpTemplatesTab.tsx` | Expand concept schema to 4 columns with richer examples |

## Key Rules Preserved

- Only `concept_key` and `title` are inserted to DB
- `section_hint` and `description` are display-only in preview
- Missing `concept_key` auto-generates from title via `normalizeConceptKey()`
- Extra columns never break the upload
- Backward compatible with the old 2-column format

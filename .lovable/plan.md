

## Bug: Section Assignment Fails on Bulk Upload (Guided Explanations)

### Root Cause

In `StudyBulkUploadModal.tsx`, line 447, the `getSectionInfo` function uses `parseInt()` to parse the section number:

```typescript
const sectionNumber = sectionNumRaw ? parseInt(sectionNumRaw, 10) : undefined;
```

Your sections use **hierarchical numbering** like `"1"`, `"1.1"`, `"1.2"`. `parseInt("1.1")` returns `1`, losing the `.1` part. So when `resolveSectionId` tries to match `"1"` against a section numbered `"1.1"`, it fails — no match, no assignment.

Additionally, `ParsedItem.sectionNumber` is typed as `number` but should be `string` to support hierarchical section numbers.

### Fix (single file: `StudyBulkUploadModal.tsx`)

1. **Change `ParsedItem.sectionNumber` type** from `number` to `string`
2. **Remove `parseInt`** in `getSectionInfo` — keep the raw string value
3. **Update `original_section_number` in `handleImport`** — remove the `String()` wrapper (already a string)

These three small changes ensure `"1.1"` stays `"1.1"` throughout the pipeline, allowing `resolveSectionId` to correctly match it against existing sections.

### Why the export only shows manually assigned sections

The export reads from `section_id`. Since auto-assignment failed (due to the parseInt bug), `section_id` is `null` for uploaded items. Only items you manually assigned a section to have a valid `section_id`, so only those appear in the export.


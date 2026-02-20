

# Fix Flashcard Bulk Upload: Section, Concept, and Export

## Problems Found

### Problem 1: CSV Export Missing concept_id
In `FlashcardsAdminTable.tsx` (lines 104-110), the `csvData` mapping creates objects with only `title`, `content`, and `section_id`. It never includes `concept_id`. When the export runs, the `FLASHCARD_EXPORT_COLUMNS` resolver tries to read `(item as any).concept_id` but it is `undefined`, resulting in empty concept columns in the downloaded CSV.

### Problem 2: Section Resolution Fails During Upload
The sections in this chapter have `section_number = null` in the database. The uploaded CSV has:
- `section_name`: "3.2 Deep Vein Thrombosis (DVT)" 
- `section_number`: "3.2"

The `resolveSectionId` function tries:
1. Match `section_number "3.2"` against DB `section_number` -- fails because DB has `null`
2. Match `section_name "3.2 Deep Vein Thrombosis (DVT)"` against DB name `"Venous thrombosis-general principles"` -- fails because names don't match

There is no fuzzy or partial matching, so all flashcards get `section_id = null`.

### Problem 3: Concept data not passed to export
Same as Problem 1 -- since `concept_id` is missing from the exported data objects, concepts appear blank in downloads.

## Technical Changes

### File 1: `src/components/study/FlashcardsAdminTable.tsx`
**Fix `csvData` mapping** (lines 104-110) to include `concept_id` so the CSV export resolver can access it:

```typescript
const csvData = useMemo(() => {
  return rows.map(row => ({
    title: row.title,
    content: { front: row.front, back: row.back },
    section_id: row.section_id,
    concept_id: row.concept_id,
  }));
}, [rows]);
```

### File 2: `src/lib/csvExport.ts`
**Improve `resolveSectionId`** to add fuzzy/partial matching as a fallback:
- After exact name match fails, try a "contains" match: check if the CSV section_name contains the DB section name, or vice versa
- Example: CSV `"3.2 Deep Vein Thrombosis (DVT)"` contains DB `"Venous thrombosis"` -- partial match

```text
Priority 1: Exact section_number match (existing)
Priority 2: Exact section_name match (existing)
Priority 3 (NEW): Partial/contains match on section_name
  - Normalize both strings to lowercase
  - Check if CSV name contains DB name, or DB name contains CSV name
  - Use the longest match to avoid false positives
```

### File 3: `src/components/study/StudyBulkUploadModal.tsx`
**Improve section name extraction** in `parseLineByType`: The CSV `section_name` column contains values like "3.2 Deep Vein Thrombosis (DVT)" which is a composite of number + name. Strip the leading number prefix before passing to `resolveSectionId` so the name-based match can work.

Add logic in `getSectionInfo()`:
```text
If sectionName starts with a number pattern like "3.2 " or "3.1 ":
  - Extract the number part as sectionNumber (if not already set)
  - Extract the remaining text as the actual sectionName
```

## Files Summary

| File | Change |
|---|---|
| `src/components/study/FlashcardsAdminTable.tsx` | Add `concept_id` to csvData mapping |
| `src/lib/csvExport.ts` | Add fuzzy/partial section name matching in `resolveSectionId` |
| `src/components/study/StudyBulkUploadModal.tsx` | Parse composite section_name values (strip number prefix) |


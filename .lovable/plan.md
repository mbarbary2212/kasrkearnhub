

# Chapter Blueprint: Excel Download + Section-Level Rows

## What This Does
Two additions to the Chapter Blueprint tab:

1. **Download as Excel** — A button that exports the current matrix (module's chapters × question types with H/A/L levels) to a formatted `.xlsx` file that can be shared with colleagues.

2. **Expandable sections under chapters** — Each chapter row can be expanded to show its sections as indented sub-rows. Each section gets its own independent H/A/L levels per question type, stored separately from the chapter-level config.

## Database Change

**Add `section_id` column to `chapter_blueprint_config`:**

```sql
ALTER TABLE chapter_blueprint_config
  ADD COLUMN section_id uuid REFERENCES sections(id) ON DELETE CASCADE DEFAULT NULL;

-- Drop old unique constraint and create new one that includes section_id
ALTER TABLE chapter_blueprint_config
  DROP CONSTRAINT chapter_blueprint_config_chapter_exam_type_component_key;

ALTER TABLE chapter_blueprint_config
  ADD CONSTRAINT chapter_blueprint_config_unique_key
  UNIQUE (chapter_id, section_id, exam_type, component_type);
```

- `section_id = NULL` → chapter-level config (existing behavior, unchanged)
- `section_id = <uuid>` → section-level config (new)

## Implementation Steps

### 1. Migration
Add `section_id` column and update the unique constraint.

### 2. Update hook: `useChapterBlueprintConfig.ts`
- Update `ChapterBlueprintConfig` interface to include `section_id: string | null`
- Update `useUpsertChapterBlueprintConfig` to accept optional `section_id` and include it in the upsert conflict key
- Config map key becomes `chapter_id::section_id::component_type`

### 3. Update component: `ChapterBlueprintSubtab.tsx`
- **Expand/collapse**: Add a chevron toggle on each chapter row. When expanded, fetch sections for that chapter using `useChapterSections(chapterId)` and render indented sub-rows.
- **Section rows**: Each section gets the same CellPopover columns, but upserts include `section_id`.
- **Download button**: Add a "Download Excel" button above the table. On click:
  - Build a workbook using ExcelJS (already available via `src/lib/excel.ts`)
  - Header row: Chapter | MCQ | Recall | Case | OSCE | Long Case | Paraclinical
  - Chapter rows with their levels (H/A/L or empty)
  - Indented section rows below each chapter (prefixed with "  → Section Name")
  - Color-code cells: High=red fill, Average=yellow fill, Low=green fill
  - Auto-download the file named `{ModuleName}_Blueprint.xlsx`

### 4. Files Changed

| File | Action |
|------|--------|
| Migration (new) | Add `section_id` column to `chapter_blueprint_config` |
| `src/hooks/useChapterBlueprintConfig.ts` | Add `section_id` to types, upsert, and config map |
| `src/components/admin/blueprint/ChapterBlueprintSubtab.tsx` | Add expand/collapse sections, download button |

## Technical Details

- Sections are loaded on-demand per chapter (only when expanded) using the existing `useChapterSections` hook
- The Excel export uses the `ExcelJS` library already in the project — no new dependencies
- The upsert conflict target changes to `chapter_id, section_id, exam_type, component_type` with a `COALESCE(section_id, '00000000-0000-0000-0000-000000000000')` approach or a partial unique index to handle NULLs properly in the unique constraint


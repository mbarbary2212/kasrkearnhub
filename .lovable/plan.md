

## Plan: Add "Replace All" Mode to Blueprint Import

### Problem
When uploading updated blueprint files for modules 423/523, the current import only updates cells that have values and clears cells with dashes. It does **not** remove old configs that aren't mentioned in the new file — so stale entries persist.

### Solution
Add a **"Replace All"** option to the import flow. Before importing, delete all existing `chapter_blueprint_config` entries for the affected module's chapters, then insert the new file's data fresh. This is the cleanest approach — no stale data, no confusion.

### Changes

**1. `src/components/admin/blueprint/blueprintExcelImport.ts`**
- Add an optional `replaceAll?: boolean` parameter to `importBlueprintFromExcel`
- When `replaceAll` is true, before upserting, delete all existing configs for the chapter IDs present in the import file
- This ensures old values are wiped and replaced with the new file's content

**2. `src/components/admin/blueprint/ChapterBlueprintSubtab.tsx`**
- Show a confirmation dialog when the user picks a file: "Replace all existing blueprint data for this module with the uploaded file?"
- Two options: **Replace All** (deletes old + imports new) and **Merge** (current behavior — updates matching cells only)
- Pass the chosen mode to `importBlueprintFromExcel`

### Behavior Summary
- **Replace All**: Deletes ALL existing blueprint configs for chapters in the file, then imports everything fresh. Best for "I have a new complete file."
- **Merge** (existing behavior): Only updates cells that exist in the file, clears dash cells. Best for partial edits.


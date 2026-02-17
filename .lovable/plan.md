

## Unify Visual Resources Admin Tables

### Problem

There are two separate admin table views with different features:
1. **Mind Map subtab table** (`MindMapAdminTable`) -- has section assignment, CSV export, uses the standardized `ContentAdminTable`
2. **Top-level table** (`VisualResourcesAdminTable`) -- has inline rename, type change dropdown, preview thumbnails, but no section assignment or CSV export

These should be one consistent table that appears under each subtab (Mind Maps, Infographics, Algorithms), filtered to show only items of that type.

### Solution

Replace both tables with a single enhanced `VisualResourcesAdminTable` that combines the best features of both:
- Checkboxes + bulk delete (both have this)
- Type dropdown to re-tag items (from `VisualResourcesAdminTable`)
- Preview thumbnails (from `VisualResourcesAdminTable`)
- Section assignment column (from `MindMapAdminTable`)
- CSV export (from `MindMapAdminTable`)
- Inline rename (from `VisualResourcesAdminTable`)
- Bulk type change for selected items

Each subtab will show the table filtered to its own type, but admins can re-tag items to move them between types.

### Technical Details

| File | Change |
|------|--------|
| `src/components/study/VisualResourcesAdminTable.tsx` | Rewrite to use `ContentAdminTable` as base (like `MindMapAdminTable`), adding type-change dropdown column, preview column, section column, and CSV export. Accept a `sections` prop. |
| `src/components/study/VisualResourcesSection.tsx` | Remove the top-level table toggle. Instead, pass the table view mode down to each subtab. Render `VisualResourcesAdminTable` inside each `TabsContent` when in table mode, filtered by type. Keep the Cards/Table toggle but always show subtabs. |
| `src/components/study/MindMapViewer.tsx` | Remove its own Cards/Table toggle and `MindMapAdminTable` usage -- the parent (`VisualResourcesSection`) now handles table mode. Accept a `viewMode` prop to decide whether to render cards or nothing (table is handled by parent). |
| `src/components/study/MindMapAdminTable.tsx` | Delete this file -- its functionality is absorbed into the unified `VisualResourcesAdminTable`. |

### What the Admin Sees

1. Opens Visual Resources tab with Mind Maps / Infographics / Algorithms subtabs (always visible)
2. Toggles to Table view using the Cards/Table button
3. Each subtab shows a table of its items with columns: Checkbox, Title (inline editable), Type (dropdown to re-tag), Preview, Section (dropdown), Actions (edit/delete)
4. Select multiple items to bulk delete or bulk change type (e.g., move all selected from Mind Maps to Infographics)
5. CSV export available per subtab

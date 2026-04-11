

## Plan: Build "Tagging Issues" Admin Panel

### What it does
A new always-on admin sub-tab under **Content > Analytics** that queries the database directly to show all content items with tagging problems. Admins can fix issues inline (assign chapter/section) or in bulk.

### Current state
- 14 content tables all have `chapter_id`, `section_id`, and most have `module_id` + `is_deleted`
- Current issues: ~60 items with no chapter, ~61 items with no section, ~30+ chapters with no sections defined
- No existing "tagging issues" view exists

### Architecture

**No database changes needed.** All queries use existing tables and columns. The panel queries content tables directly via Supabase client.

### Files to create

1. **`src/hooks/useTaggingIssues.ts`** — React Query hook that:
   - Queries all 14 content tables for items where `chapter_id IS NULL` or `section_id IS NULL` (excluding deleted)
   - Queries `module_chapters` joined with `sections` to find chapters with zero sections
   - Returns a unified array of `TaggingIssue` objects with: `id`, `tableName`, `contentPreview`, `moduleId`, `chapterId`, `sectionId`, `issueType`
   - Paginated: fetches 100 items at a time per table, client-side merged
   - Provides `assignChapter(table, id, chapterId)` and `assignSection(table, id, sectionId)` mutation functions

2. **`src/components/admin/TaggingIssuesTab.tsx`** — Main UI component:
   - Filters: issue type dropdown, table name dropdown, module dropdown, chapter dropdown
   - Search bar for content preview text
   - Data table with columns: Content Preview, Table, Module, Chapter, Section, Issue Type, Actions
   - Action buttons per issue type:
     - `no_chapter` → chapter dropdown selector, save immediately
     - `no_section` → section dropdown (filtered by item's chapter), save immediately
     - `no_sections_defined` → warning badge + "Open Blueprint" link
   - Bulk actions toolbar: select rows → "Assign Chapter" / "Assign Section" to all selected
   - "Export to CSV" button
   - Pagination controls (100 per page)

### Integration into admin panel

3. **`src/components/admin/ContentAnalyticsTab.tsx`** — Add new sub-tab "Tagging Issues" with a `Tag` icon, visible to super_admin and platform_admin

4. **`src/components/admin/AdminTabsNavigation.tsx`** — No changes needed (it's a sub-tab inside Analytics)

5. **`src/pages/AdminPage.tsx`** — No changes needed (already renders ContentAnalyticsTab)

### Query strategy (performance)

Rather than one giant UNION query, the hook will:
- Run parallel queries against each content table with `LIMIT 100` and the active filters
- Each query selects only: `id`, first text column (for preview), `chapter_id`, `section_id`, `module_id`
- Filter server-side: `.is('chapter_id', null)` or `.is('section_id', null)` depending on selected issue type
- Cache with React Query, 5-minute stale time
- Chapters and sections lists fetched once for dropdown population

### Bulk actions flow

- Checkbox column on each row
- Floating action bar appears when rows selected
- "Assign Chapter" opens a chapter picker dialog → updates all selected rows
- "Assign Section" opens a section picker (only if all selected share same chapter) → updates all selected

### Technical details

- All updates use individual Supabase `.update()` calls per row (safe with RLS since admins have write access)
- After mutation, invalidate the tagging issues query to refresh
- CSV export generates client-side from current filtered data, downloads as `tagging-issues-{date}.csv`


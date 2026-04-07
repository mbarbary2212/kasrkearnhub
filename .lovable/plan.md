

# Fix Mind Maps Table View + AI Auto-Assign Content to Sections

## Two Issues

### Issue 1: Mind Maps Table View Not Working
The "Table" view toggle in Visual Resources shows a `VisualResourcesAdminTable` which only renders `study_resources` mind maps. The **AI Mind Maps** (stored in the `mind_maps` table) are only shown in the Cards view inside `MindMapAdminPanel`. When an admin switches to Table view, the AI mind maps disappear — there is no section assignment column in `MindMapAdminPanel`'s `MapGroup` table either.

**Fix**: Add a section assignment dropdown column to the `MapGroup` table inside `MindMapAdminPanel.tsx`, so admins can assign AI mind maps to sections directly from the existing table. This requires:
- Pass `sections` prop into `MindMapAdminPanel` (already available from `useChapterSections` in the parent)
- Add a "Section" column to the `MapGroup` table with a `Select` dropdown
- Create a mutation to update `mind_maps.section_id` via supabase

### Issue 2: AI Auto-Assign Content to Sections
The existing `useAutoTagSections` hook + `ai-auto-tag-sections` edge function already handles AI-powered section assignment for 11 content tables. But `mind_maps` is not included.

**Fix**: Add `mind_maps` to the auto-tag pipeline so when admins click "Auto Detect" for sections, mind maps are also assigned.

## File Changes

| File | Action | What |
|---|---|---|
| `src/components/admin/MindMapAdminPanel.tsx` | **Modify** | Add `sections` prop, add Section column to MapGroup table with dropdown, add section update mutation |
| `src/hooks/useMindMaps.ts` | **Modify** | Add `useUpdateMindMapSection` mutation hook |
| `src/components/study/VisualResourcesSection.tsx` | **Modify** | Pass `sections` to `MindMapAdminPanel` |
| `src/hooks/useAutoTagSections.ts` | **Modify** | Add `mind_maps` to `CONTENT_TABLES` and `CONTENT_COLUMNS` |

## Details

**MindMapAdminPanel — Section Column**: Each row in the MapGroup table gets a Select dropdown (matching the pattern in `ContentAdminTable`'s section column) that updates `mind_maps.section_id` via a new `useUpdateMindMapSection` hook.

**Auto-Tag Integration**: Add `'mind_maps'` to `CONTENT_TABLES` array with columns `['title', 'section_title']` in `CONTENT_COLUMNS`. The existing AI matching logic will then automatically include untagged mind maps when admins run "Auto Detect" on sections.


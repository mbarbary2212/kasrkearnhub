

# Chapter Blueprint Tab — Admin UI for Chapter Exam Profiles

## What This Does
Adds a new "Chapter Blueprint" subtab inside the Assessment Blueprint area. It shows a table of all chapters in a selected module, with columns for each question type. The admin checks which question types apply to each chapter and sets an importance level (High / Average / Low) for each.

## Database (Already Exists)
The `chapter_blueprint_config` table is already in Supabase with these columns:
- `chapter_id`, `module_id`, `exam_type`, `component_type`, `inclusion_level` (High/Average/Low)

No migration needed.

## Implementation Steps

### 1. Create hook: `src/hooks/useChapterBlueprintConfig.ts`
- `useChapterBlueprintConfigs(moduleId)` — fetches all rows from `chapter_blueprint_config` where `module_id` matches
- `useUpsertChapterBlueprintConfig()` — mutation that upserts a row (insert if new chapter+component_type combo, update if exists)
- `useDeleteChapterBlueprintConfig()` — mutation to remove a row (uncheck a question type)

### 2. Create component: `src/components/admin/blueprint/ChapterBlueprintSubtab.tsx`
- Year and Module selectors at the top (same pattern as TopicWeightsSubtab)
- Fetch chapters for the selected module using `useModuleChapters`
- Fetch existing config rows using the new hook
- Render a table:

```text
┌──────────────┬─────┬────────┬──────┬──────┬───────────┬──────────────┐
│ Chapter      │ MCQ │ Recall │ Case │ OSCE │ Long Case │ Paraclinical │
├──────────────┼─────┼────────┼──────┼──────┼───────────┼──────────────┤
│ Ch 1: Cardio │  H  │   A    │  H   │  —   │     L     │      —       │
│ Ch 2: Resp   │  A  │   —    │  A   │  H   │     —     │      —       │
└──────────────┴─────┴────────┴──────┴──────┴───────────┴──────────────┘
```

- Each cell is either empty (—, meaning this question type is not applicable) or shows a badge/select with the inclusion level: **High**, **Average**, or **Low**
- Clicking an empty cell opens a small dropdown to set the level (defaults to Average)
- Clicking an existing badge opens the same dropdown to change level, with an option to clear/remove
- Changes are saved immediately via upsert/delete mutations
- Color-coded badges: High = red/strong, Average = yellow/amber, Low = green/muted

### 3. Wire into AssessmentBlueprintTab
- Import `ChapterBlueprintSubtab`
- Add a new tab trigger: `<TabsTrigger value="chapters">Chapter Blueprint</TabsTrigger>` — placed as the first tab
- Add corresponding `<TabsContent value="chapters">`
- Change the default subtab from `'structure'` to `'chapters'`

### Files Changed
| File | Action |
|------|--------|
| `src/hooks/useChapterBlueprintConfig.ts` | Create — query + mutations for `chapter_blueprint_config` |
| `src/components/admin/blueprint/ChapterBlueprintSubtab.tsx` | Create — table UI with inline level editing |
| `src/components/admin/blueprint/AssessmentBlueprintTab.tsx` | Edit — add the new subtab |

### Component Types Shown as Columns
Based on the memory context (Short Case removed, OSCE covers short clinical):
**MCQ, Short Answer (Recall), Short Answer (Case), OSCE, Long Case, Paraclinical**

### UX Details
- Uses existing shadcn `Select`, `Badge`, `Table`, `ScrollArea` components
- Each cell uses a `Popover` or inline `Select` with options: High, Average, Low, Clear
- Loading spinner while fetching
- Empty state when no module selected


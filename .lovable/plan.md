

# Fix Plan: Pathway Count + Track Remaining Content Types

## Part 1 — Pathway Count Bug

**Root cause**: The `get_content_progress` RPC's `pathway_total_cte` does NOT filter `is_deleted`. It counts all pathways including deleted ones. The client query (`useChapterAlgorithms`) filters `.eq('is_deleted', false)`, so the UI shows fewer items than the RPC reports.

**Fix**: Add `AND NOT is_deleted` to `pathway_total_cte` in the RPC.

## Part 2 — Track 4 Remaining Content Types

Mind maps, guided explanations, reference materials, and clinical tools all live in the `study_resources` table with different `resource_type` values. None currently call `useTrackContentView`.

### RPC Changes (single migration)

Update `get_content_progress` to:
1. Fix `pathway_total_cte` — add `AND NOT is_deleted`
2. Add 4 new CTE pairs counting from `study_resources` (totals) and `content_views` (viewed):
   - `mind_map_total` / `mind_map_viewed` — `resource_type = 'mind_map'`
   - `guided_total` / `guided_viewed` — `resource_type = 'guided_explanation'`
   - `reference_total` / `reference_viewed` — `resource_type IN ('table','exam_tip','summary','socratic_tutorial')`
   - `clinical_tool_total` / `clinical_tool_viewed` — `resource_type = 'clinical_case_worked'`

Note: "reference_materials" in the UI maps to multiple `resource_type` values (tables, exam tips, summaries, socratic tutorials) — these are what populate the "Reference Materials" tab. We need to verify the exact types used.

### Component Changes — Add tracking calls

Each component already accepts `chapterId`/`topicId` props. Add `useTrackContentView` import and `.mutate()` call at the interaction trigger:

| Component | Trigger | `contentType` value |
|---|---|---|
| `MindMapViewer.tsx` | `setFullscreenResource(resource)` | `'mind_map'` |
| `GuidedExplanationList.tsx` | `setSelectedResource(resource)` | `'guided_explanation'` |
| `RichDocumentViewer.tsx` | `setIsExpanded(true)` | `'reference_material'` |
| `WorkedCaseCard.tsx` | `setIsOpen(true)` | `'clinical_tool'` |

`WorkedCaseCard` doesn't currently accept `chapterId`/`topicId` — these need to be added as props and passed from `ClinicalToolsSection` → `ChapterPage`/`TopicDetailPage`.

### Hook Changes

**`useChapterProgress.ts`** and **`useContentProgress.ts`**:
- Add to `RpcProgressResult`: `mind_map_total`, `mind_map_viewed`, `guided_total`, `guided_viewed`, `reference_total`, `reference_viewed`, `clinical_tool_total`, `clinical_tool_viewed`
- Add corresponding fields to the return interface
- Parse from RPC response

### Page Changes

**`ChapterPage.tsx`** — update `getTabCounts`:
- `mind_maps` → use `chapterProgress.mindMapViewed` / `chapterProgress.mindMapTotal`
- `guided_explanations` → use `chapterProgress.guidedViewed` / `chapterProgress.guidedTotal`
- `reference_materials` → use `chapterProgress.referenceViewed` / `chapterProgress.referenceTotal`
- `clinical_tools` → use `chapterProgress.clinicalToolViewed` / `chapterProgress.clinicalToolTotal`

**`TopicDetailPage.tsx`** — same pattern using `topicProgress`.

## Files to Change

| File | Change |
|---|---|
| **Migration SQL** | Fix pathway `is_deleted`, add 8 new CTEs to RPC |
| `src/hooks/useChapterProgress.ts` | Add 8 new fields to interface + parsing |
| `src/hooks/useContentProgress.ts` | Mirror same 8 new fields |
| `src/pages/ChapterPage.tsx` | Fix 4 `getTabCounts` cases |
| `src/pages/TopicDetailPage.tsx` | Fix 4 `getTabCounts` cases (if present) |
| `src/components/study/MindMapViewer.tsx` | Add tracking call on fullscreen open |
| `src/components/study/GuidedExplanationList.tsx` | Add tracking call on select |
| `src/components/study/RichDocumentViewer.tsx` | Add `chapterId`/`topicId` props + tracking on expand |
| `src/components/study/WorkedCaseCard.tsx` | Add `chapterId`/`topicId` props + tracking on open |
| `src/components/study/ClinicalToolsSection.tsx` | Pass `chapterId`/`topicId` to `WorkedCaseCard` |

## Risks

- **Reference materials scope**: Need to confirm which `resource_type` values map to the "Reference Materials" tab — if it includes types beyond `table`/`exam_tip`/`summary`/`socratic_tutorial`, the RPC CTE will undercount.
- **RLS on `content_views`**: Must verify INSERT policy exists; otherwise tracking writes silently fail.
- **AI Mind Maps**: The mind_maps tab also shows AI-generated maps from a separate table (`ai_mind_maps`). The RPC only counts `study_resources`. If AI maps should also be tracked, additional CTEs are needed.


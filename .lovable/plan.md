
# Feature Parity: Topics and Chapters

## Overview

This plan aligns the TopicDetailPage (Pharmacology) with ChapterPage (Surgery), ensuring identical functionality. The changes also add Audio upload capability to chapters.

---

## Identified Gaps

### TopicDetailPage Missing (vs ChapterPage):

| Feature | Status |
|---------|--------|
| Progress Bar | Missing |
| Ask Coach Button | Missing |
| Mobile Section Dropdown | Missing |
| Mind Maps tab | Missing |
| Guided Explanations tab | Missing |
| Clinical Tools tab | Missing |
| Reference Materials (Tables/Tips/Images/Documents sub-tabs) | Missing - only shows basic links |
| Clinical Case Admin List | Missing - shows simple cards instead |

### ChapterPage Missing:

| Feature | Status |
|---------|--------|
| Audio Upload Dialog | Not shown in UI (AudioUploadDialog supports chapterId but not rendered in ChapterPage) |

---

## Implementation Plan

### Phase 1: Add Missing Imports and Hooks to TopicDetailPage

**File: `src/pages/TopicDetailPage.tsx`**

Add imports:
- `ChapterProgressBar` component
- `AskCoachButton` component
- `MobileSectionDropdown` component
- `MindMapViewer` component
- `MindMapBulkUploadModal` component
- `GuidedExplanationList` component
- `ClinicalToolsSection` component
- `ResourcesTabContent` component
- `ClinicalCaseAdminList` component
- `useCoachContext` hook
- `useTopicStudyResources` hook (already partially imported)
- Progress tracking hook (create `useTopicProgress` or reuse existing)

### Phase 2: Add Progress Bar to TopicDetailPage

Use the existing `useContentProgress` hook or create a dedicated `useTopicProgress` hook mirroring `useChapterProgress`.

Add the `ChapterProgressBar` component below the header (same position as ChapterPage).

### Phase 3: Add Ask Coach Button

Add `AskCoachButton` to the header area, visible when not an admin and in Resources or Practice sections.

### Phase 4: Add Mobile Section Dropdown

Replace the simple button tabs on mobile with `MobileSectionDropdown` for both Resources and Practice sub-tabs.

### Phase 5: Expand Resources Tabs

Update the `resourcesTabs` configuration to include:
- Mind Maps (count from `useTopicStudyResourcesByType(topicId, 'mind_map')`)
- Guided Explanations (count from study resources with type `guided_explanation`)
- Clinical Tools (algorithms + worked cases count)
- Keep Reference Materials but use the full `ResourcesTabContent` component logic

Add tab content rendering for:
- `mind_maps` - Use `MindMapViewer` with topic-filtered resources
- `guided_explanations` - Use `GuidedExplanationList` with topic-filtered resources
- `clinical_tools` - Use `ClinicalToolsSection` with algorithms and worked cases
- `reference_materials` - Either create a new `TopicResourcesTabContent` or adapt existing

### Phase 6: Update Clinical Cases Admin View

When `canManageContent` is true, render `ClinicalCaseAdminList` with `topicId` instead of the simple Card view.

### Phase 7: Add Audio Upload to ChapterPage

**File: `src/pages/ChapterPage.tsx`**

The `AudioUploadDialog` component already supports `chapterId`, but it's only rendered via `AdminContentActions` in the Resources tab. Verify it appears when `contentType="resource"` is used.

If not visible, add explicit AudioUploadDialog button in the Lectures tab admin actions (similar to how Topics handle it).

### Phase 8: Create/Update Supporting Hooks

**File: `src/hooks/useTopicProgress.ts`** (new or update existing)

Create a hook mirroring `useChapterProgress` that:
- Queries `question_attempts` with `topic_id`
- Queries `video_progress` with `topic_id`
- Returns same shape: `totalProgress`, `practiceProgress`, `videoProgress`, etc.

**File: `src/components/study/MindMapBulkUploadModal.tsx`**

Update to accept optional `topicId` prop alongside `chapterId`.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/TopicDetailPage.tsx` | Major update - add all missing features |
| `src/pages/ChapterPage.tsx` | Minor - verify Audio upload visibility |
| `src/hooks/useTopicProgress.ts` | New file or update existing progress hook |
| `src/components/study/MindMapBulkUploadModal.tsx` | Add `topicId` support |
| `src/components/study/MindMapViewer.tsx` | Ensure works with `topic_id` (may need update for section fetching) |
| `src/components/study/GuidedExplanationList.tsx` | Ensure works with `topic_id` |
| `src/components/study/ClinicalToolsSection.tsx` | Already has `topicId` prop |
| `src/components/content/ResourcesTabContent.tsx` | Create topic variant or make dual-support |

---

## Technical Details

### TopicDetailPage Changes (Detailed)

1. **State additions:**
   - `mindMapBulkOpen` for MindMapBulkUploadModal
   - Study resource type states for various modals

2. **Hook additions:**
   - `useTopicStudyResources(topicId)` - fetch all study resources
   - Progress hook for topic

3. **Computed values:**
   - Filter study resources by type: flashcards, algorithms, mindMaps, workedCases, guidedExplanations
   - Count document study resources (table, exam_tip, key_image)

4. **Resources tabs update:**
   ```typescript
   const resourcesTabs = createResourceTabs({
     lectures: lectures?.length || 0,
     flashcards: flashcards?.length || 0,
     mind_maps: mindMaps.length,
     guided_explanations: guidedExplanations.length,
     reference_materials: documentsCount,
     clinical_tools: algorithms.length + workedCases.length,
   });
   ```

5. **Tab content rendering:**
   - Add cases for `mind_maps`, `guided_explanations`, `clinical_tools`
   - Update `reference_materials` to use richer component

### Progress Hook for Topics

Mirror the chapter progress calculation:
- 60% weight on practice (MCQs, True/False, OSCE, Essays, Matching)
- 40% weight on videos (lecture watch progress)

Query using `topic_id` column instead of `chapter_id`.

---

## Expected Outcome

After implementation:
- TopicDetailPage will have identical feature set to ChapterPage
- Both pages support audio upload
- Students see consistent UI regardless of module type (chapter vs topic based)
- Admins have full CRUD on all content types in both contexts

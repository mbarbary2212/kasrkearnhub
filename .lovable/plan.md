

# Visual Resources Implementation Plan

## Completed

- [x] Database migration: added `infographic` to `study_resource_type` enum
- [x] Type updates: added `infographic` to `StudyResourceType`, `fileUrl`/`fileType` to `MindMapContent`, new `InfographicContent` interface
- [x] Tab config: renamed "Visual Summaries" → "Visual Resources"
- [x] Fixed `Record<StudyResourceType>` maps in `StudyResourceFormModal`, `StudyBulkUploadModal`, `StudyResourceTypeSection`
- [x] Created `VisualResourcesSection.tsx` with 3 subtabs (Mind Maps, Infographics, Algorithms) + search + admin-only buttons
- [x] Created `InfographicForm.tsx` (image/PDF upload only, uses `fileUrl`)
- [x] Created `InfographicViewer.tsx` (card grid + fullscreen modal with zoom)
- [x] Updated `MindMapForm.tsx`: accepts `.html/.htm/.svg`, detects `fileType`, shows HTML placeholder
- [x] Updated `MindMapViewer.tsx`: HTML files render in sandboxed `<iframe>`, uses `getContentFileUrl()` for backward compat
- [x] Updated `ChapterPage.tsx`: uses `VisualResourcesSection`, updated tab counts (mind_maps = mindMaps + infographics + algorithms), clinical_tools count excludes algorithms
- [x] Updated `TopicDetailPage.tsx`: same changes as ChapterPage

## Remaining

- [ ] Update `AppMindMap.tsx` to load from `study_settings` (database-driven, student/admin versions)
- [ ] Add admin settings section for Home Mind Map (platform_admin/super_admin only)
- [ ] Simplify `ClinicalToolsSection.tsx` to remove algorithms subtab (currently passing empty array)
- [ ] Handle `infographic` type in `StudyResourceFormModal` form rendering (InfographicForm)
- [ ] Update memory notes for visual-summaries → visual-resources naming



# Replace Gear Icon with Inline Sections Toggle

## Problem
The gear/settings icon in the chapter header is not intuitive for admins. Since "Sections" is the only setting, there's no need for a separate sheet/modal -- the toggle should be directly visible in the chapter header area.

## Solution
Remove the `ChapterSettingsSheet` and `TopicSettingsSheet` components from the chapter/topic headers. Instead, render the `SectionsManager` card inline, directly below the progress bar (or below the header), visible only to admins. This keeps the toggle and section management always visible without requiring admins to hunt for a gear icon.

## Design

The sections toggle and management will appear as an inline collapsible card below the chapter progress bar, admin-only:

```text
Chapter 1: Esophagus
[Progress bar]

 Sections  [Enable toggle]
 "Organize content into sections for students"
 [section list + add section -- when enabled]
```

No gear icon, no sheet/modal. The `SectionsManager` component already has the correct UI (card with toggle, section list, add form) -- it just needs to be placed inline instead of inside a Sheet.

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/ChapterPage.tsx` | Remove `ChapterSettingsSheet` import and usage. Import `SectionsManager` directly. Render it inline below the progress bar, admin-only. |
| `src/pages/TopicDetailPage.tsx` | Same change: remove `TopicSettingsSheet`, render `SectionsManager` inline. |
| `src/components/module/ChapterSettingsSheet.tsx` | Can be deleted (no longer used). |
| `src/components/module/TopicSettingsSheet.tsx` | Can be deleted (no longer used). |

## Technical Details

### ChapterPage.tsx (~line 335-342)

Replace:
```typescript
{canManageContent && chapterId && chapter && (
  <ChapterSettingsSheet
    chapterId={chapterId}
    chapterTitle={...}
    canManage={canManageContent}
  />
)}
```

With inline SectionsManager rendered below the progress bar (~after line 365):
```typescript
{canManageContent && chapterId && (
  <SectionsManager chapterId={chapterId} canManage={canManageContent} />
)}
```

### TopicDetailPage.tsx (~line 333-339)

Same pattern -- replace `TopicSettingsSheet` with inline `SectionsManager` using `topicId` prop.

### Cleanup

Remove imports for `ChapterSettingsSheet` and `TopicSettingsSheet`. The `SectionsManager` is already exported from `@/components/sections`. Delete the two Sheet component files since they will no longer be referenced.

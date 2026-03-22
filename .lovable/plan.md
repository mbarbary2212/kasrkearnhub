

# Fix: Topic Admin Access Control for Chapters

## Problem
1. Topic admins can navigate to any chapter URL even if they're not assigned to it
2. In the module's chapter list, topic admins see all chapters as fully clickable — no visual distinction between assigned and unassigned

## Changes

### 1. ChapterPage.tsx — Redirect unassigned topic admins (line ~129)

After the `canManageContent` calculation, add a redirect effect:

```tsx
useEffect(() => {
  if (auth.isTopicAdmin && !auth.isTeacher && chapterId && !auth.canManageChapter(chapterId)) {
    toast.error('Access denied: you are not assigned to this chapter');
    navigate(moduleId ? `/module/${moduleId}?section=learning` : '/');
  }
}, [auth.isTopicAdmin, auth.isTeacher, chapterId, moduleId]);
```

This checks client-side `topicAssignments` (already loaded in `useAuth`) — if the topic admin has no assignment for this chapter, they're redirected back to the module page with a toast.

### 2. ModuleLearningTab.tsx — Grey out unassigned chapters for topic admins

In `renderChapterList` (~line 582), pass `useAuthContext` into the component and check assignment:

- Import `useAuthContext` in ModuleLearningTab
- In the chapter row rendering, determine `isAssigned`:
  - If `auth.isTopicAdmin && !auth.isTeacher`: check `auth.canManageChapter(chapter.id)`
  - Otherwise: always true
- If `!isAssigned`: render the row with `opacity-50 cursor-default` classes, no `onClick`/navigation, and no chevron — just the greyed-out title
- If `isAssigned`: render normally (clickable, with navigation)

### Files Modified

| File | Change |
|------|--------|
| `src/pages/ChapterPage.tsx` | Add `useEffect` redirect after `canManageContent` for unassigned topic admins |
| `src/components/module/ModuleLearningTab.tsx` | Import `useAuthContext`, conditionally grey out and disable unassigned chapter rows for topic admins |


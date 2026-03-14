

# Video Analytics Admin Tab — Implementation Plan

Claude's prompt is well-aligned with the plan we already agreed on. No changes needed — just confirming the final spec.

## What Gets Built

3 files touched: 1 new hook, 1 new component, 1 modified component. No database changes.

---

## Step 1 — `src/hooks/useVideoAnalytics.ts` (Create)

- Fetches 4 datasets in parallel via `Promise.all`:
  1. `lectures` — id, title, video_url, created_at
  2. `video_progress` — video_id, user_id, percent_watched
  3. `user_bookmarks` (item_type = 'video') — item_id, user_id
  4. `video_ratings` — video_id, user_id, rating
- For each lecture, uses `extractYouTubeId(lecture.video_url)` to map to engagement data
- Calculates per-lecture: total_viewers, avg_completion_rate, fully_watched_count, bookmarked_count, thumbs_up, thumbs_down
- React Query, key `['video-analytics']`, enabled only for admin roles (matching existing `useAuthContext` pattern)

## Step 2 — `src/components/admin/VideoAnalyticsTab.tsx` (Create)

**Summary cards** (3, matching existing admin card styling):
- Most Watched — highest total_viewers
- Most Bookmarked — highest bookmarked_count
- Needs Attention — lowest avg_completion_rate where total_viewers >= 5

**Sortable table** (matching `UserAnalyticsTab` patterns — same Table components, Skeleton loading, Badge pills):
- Columns: Title, Total Viewers, Avg Completion % (progress bar + number, color-coded), Fully Watched, Bookmarked, Thumbs Up/Down counts, Approval % pill
- Approval pill colors: green >= 75%, amber 50-74%, red < 50%, grey "No ratings"
- Default sort: total_viewers descending
- Empty state message when no data

## Step 3 — `src/components/admin/ContentAnalyticsTab.tsx` (Modify)

Add 4th tab entry to the existing tabs array:
```
{ value: 'video-analytics', label: 'Video Analytics', icon: Video, visible: isSuperAdmin || isPlatformAdmin || isModuleAdmin }
```
Add corresponding `TabsContent` rendering `<VideoAnalyticsTab />`. No changes to existing 3 tabs.

---

## Files Summary

| File | Action |
|------|--------|
| `src/hooks/useVideoAnalytics.ts` | Create |
| `src/components/admin/VideoAnalyticsTab.tsx` | Create |
| `src/components/admin/ContentAnalyticsTab.tsx` | Modify — add 4th sub-tab |

**Not modified**: LectureList, YouTubePlayer, VideoNotesDrawer, student hooks, edge functions, or any student-facing code. No database migrations.




# Video Engagement Features — Complete Implementation Plan

## Answer to Your Questions

**"Videos are called lectures in the backend — will that change?"**
No. The `lectures` table stays as-is. The UI says "Videos" or "Chapters" to students, but the backend table is `lectures`. No renaming.

**"Do I need to do anything on YouTube?"**
No. The YouTube IFrame Player API is a free JavaScript library loaded from `https://www.youtube.com/iframe_api`. No API key, no YouTube account setup, no configuration on YouTube's side. It just works. You keep uploading video URLs exactly as you do now — nothing changes in your workflow.

---

## What Gets Built (8 Features)

1. **Mark as Watched** — checkmark button on each video card
2. **Watch Later** — bookmark button, saves to new table
3. **Thumbs Up / Down** — rating buttons with counts
4. **Video Notes** — timestamped notes per video in a slide-out drawer
5. **Filter Pills** — All / Watch Later / Watched / Recently Added
6. **Progress Bar** — thin bar on thumbnail showing percent watched
7. **Badges** — "NEW" for recent videos, "Popular" for highly rated ones
8. **Resume Playback** — YouTube IFrame API replaces plain iframe, auto-seeks to last position

---

## Step 1 — Database (3 new tables)

**`user_bookmarks`** — generic bookmarks (Watch Later)
- `id`, `user_id`, `item_type` (text), `item_id` (text), `created_at`
- Unique on `(user_id, item_type, item_id)`, RLS: users manage own rows

**`video_notes`** — timestamped student notes
- `id`, `user_id`, `video_id` (text), `timestamp_seconds` (int), `note_text` (text), `created_at`, `updated_at`
- RLS: users manage own rows, trigger for `updated_at`

**`video_ratings`** — thumbs up/down
- `id`, `user_id`, `video_id` (text), `rating` (smallint, 1 or -1), `created_at`
- Unique on `(user_id, video_id)`, RLS: users manage own rows

No changes to `lectures` or `video_progress` tables.

---

## Step 2 — New Hooks (4 files)

| Hook | What it does |
|------|-------------|
| `useVideoBookmarks` | Query/toggle bookmarks where `item_type='video'`. Returns `Set<string>` of bookmarked video IDs |
| `useManualVideoComplete` | Query `video_progress` for watched status. `markWatched()` upserts `percent_watched=100`. `unmarkWatched()` deletes the row. Returns `Set<string>` of watched IDs + `Map<string,number>` of percent values |
| `useVideoNotes` | CRUD for `video_notes` by video ID |
| `useVideoRatings` | Query/toggle ratings. Returns user's rating per video + aggregate thumbs up/down counts. Toggle logic: same rating clicked again removes it |

All use React Query, invalidate on mutation, no optimistic updates. Auth via `useAuthContext`.

---

## Step 3 — YouTube Player Component (new file)

Create `src/components/content/YouTubePlayer.tsx`:

- Loads YouTube IFrame API script dynamically (checks `window.YT` first)
- Creates a `YT.Player` instance targeting a div
- **On ready**: fetches `video_progress` for this `video_id` + user. If `last_time_seconds > 10` and `percent_watched < 95`, seeks to that position. Logs `"Resume playback: seeking to Xs"` to console
- **On state change**:
  - Playing (state 1): starts 10-second interval upserting `video_progress` with `getCurrentTime()` and calculated percent
  - Paused/Ended: clears the interval
  - Ended (state 0): upserts with `percent_watched = 100`
- Replaces the plain `<iframe>` in the video player modal inside `LectureList`
- Only used for YouTube videos — Google Drive keeps the plain iframe

---

## Step 4 — LectureList Changes

Modify `src/components/content/LectureList.tsx`:

**A) Data fetching** — call all 4 hooks on mount to get watched IDs, bookmarked IDs, ratings, and percent watched for all lectures. Extract video IDs from `video_url` using `extractYouTubeId`.

**B) Filter pills** (student view only, above the list):
- "All" (default), "Watch Later" (blue bookmark), "Watched" (green check), "Recently Added" (amber, last 14 days via `created_at`)

**C) Each lecture row gets**:
- **Progress bar**: thin blue bar at bottom of thumbnail showing `percent_watched`
- **"NEW" badge**: top-left of thumbnail if `created_at` within 14 days
- **Watched overlay**: green checkmark + `brightness(0.85)` when watched
- **"Popular" pill**: if `thumbsUpCount >= 10` and ratio >= 75%
- **Action buttons** (bottom-right, `e.stopPropagation()`):
  1. CheckCircle — watched toggle (grey/green)
  2. Bookmark — watch later toggle (grey/blue)
  3. ThumbsUp + count (grey/green)
  4. ThumbsDown + count (grey/red)
  5. FileText — opens notes drawer (blue dot if notes exist)

**D) Video player modal**: replace plain `<iframe>` with `<YouTubePlayer>` for YouTube videos.

---

## Step 5 — Video Notes Drawer (new file)

Create `src/components/content/VideoNotesDrawer.tsx`:

- Uses shadcn `Sheet` (right side)
- Header: "Notes — {video title}"
- Input: text field + optional timestamp (seconds) + "Add Note" button
- List: notes sorted by `timestamp_seconds`, each shows formatted time (e.g. "2:34"), text, delete button
- Uses `useVideoNotes` hook

---

## Step 6 — Resume Playback

Handled entirely by the new `YouTubePlayer` component (Step 3). Uses existing `video_progress` table. No changes to `VimeoPlayer` or `useVideoProgress`.

---

## Files Summary

| File | Action |
|------|--------|
| 3 Supabase migrations | Create `user_bookmarks`, `video_notes`, `video_ratings` |
| `src/hooks/useVideoBookmarks.ts` | Create |
| `src/hooks/useManualVideoComplete.ts` | Create |
| `src/hooks/useVideoNotes.ts` | Create |
| `src/hooks/useVideoRatings.ts` | Create |
| `src/components/content/YouTubePlayer.tsx` | Create |
| `src/components/content/VideoNotesDrawer.tsx` | Create |
| `src/components/content/LectureList.tsx` | Modify — add filters, badges, action buttons, progress bar, swap iframe for YouTubePlayer |

**Not modified**: VimeoPlayer, useVideoProgress, VideoPlayerModal, VideoCard, VideoList, edge functions, ElevenLabs, TTS, navigation, admin dashboard, constants.


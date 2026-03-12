

# Implementation Plan: Collapse N+1 Progress Calls via RPC

## Problem
Sentry N+1 alert: `useChapterProgress` and `useContentProgress` each make ~17 sequential Supabase REST calls per page load. This affects every chapter and topic page.

## Solution
Create one Supabase RPC `get_content_progress` and refactor both hooks to use it. **17 calls → 1.**

---

## Step 1: Database Migration — Create `get_content_progress` RPC

A single `SECURITY DEFINER` function that accepts `p_chapter_id`, `p_topic_id`, `p_user_id` (chapter and topic are mutually exclusive). It uses CTEs to:
- Count all content items (mcqs, essays, osce_questions, virtual_patient_cases, matching_questions) filtered by chapter or topic
- Count distinct completed items from `question_attempts` for the user
- Return lecture `video_url` values for client-side video ID extraction
- Return the user's full `video_progress` (small per-user table; client matches IDs via JS regex since `video_id` is a YouTube/GDrive ID not directly joinable in SQL)

Returns a single JSONB object with all totals, completed counts, lectures array, and video progress array.

## Step 2: Refactor `useChapterProgress.ts`

Replace the 17-call waterfall in `useChapterProgress()` with a single `supabase.rpc('get_content_progress', { p_chapter_id, p_topic_id: null, p_user_id })` call. Keep the video ID extraction (`extractVideoId`) and weighted progress calculation on the client side (same existing logic). Return shape stays identical — `ChapterProgressData` interface unchanged.

The `useInvalidateChapterProgress` and `useMarkItemComplete` exports remain untouched.

## Step 3: Refactor `useContentProgress.ts`

Same refactor — replace the 3-round waterfall with the same RPC call, passing either `p_chapter_id` or `p_topic_id`. Return shape stays identical. `useInvalidateContentProgress` unchanged.

## Step 4: Update `plan.md`

Add a new entry documenting this optimization.

---

## What stays the same
- All 6 consumer files (`ChapterPage`, `TopicDetailPage`, `McqCard`, `OsceQuestionCard`, `EssayDetailModal`, `TrueFalseCard`, `MatchingQuestionCard`) — no changes needed
- `useMarkItemComplete` — unchanged
- `useInvalidateChapterProgress` / `useInvalidateContentProgress` — unchanged
- Video extraction logic in `src/lib/video.ts` — unchanged

## Impact
- **17 API calls → 1** per chapter/topic page load
- Resolves Sentry N+1 alert
- No breaking changes to any consumer


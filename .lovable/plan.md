

# Proposal: Group Lecture Videos by Topic Across Doctors

## Audit findings (current state)

**`lectures` table** already has these relevant columns:
- `id`, `title`, `description` (used as doctor name, e.g. "Dr. Hussein Khairy"), `video_url`, `youtube_video_id`, `duration`
- `chapter_id` (set on **214/214** rows), `module_id`, `section_id`, `concept_id`
- `topic_id` (**exists but NULL on 214/214 rows** — never used for lectures)

**`topics` table** already exists with: `id`, `name`, `slug`, `department_id`, `module_id`, `display_order`. It's currently used for department/module navigation, not for lecture grouping.

**Doctor field**: there is no `doctor_id` or join to `profiles` — the doctor name lives as plain text in `lectures.description` (8 distinct values today).

**Current behavior**: a lecture is one (chapter × doctor × video). Two doctors covering "Peptic Ulcer" produce two unrelated lecture rows in different/same chapters with no shared key.

## Schema change (minimal, additive — no destructive migration)

Rather than create a new `topics`-style table, **reuse the existing `topics` table** and finally populate `lectures.topic_id`. This avoids duplicating concepts.

```sql
-- 1. Index the existing (currently unused) FK so lookups are fast
CREATE INDEX IF NOT EXISTS idx_lectures_topic_id 
  ON public.lectures(topic_id) WHERE is_deleted = false;

-- 2. Ensure FK exists (verify before applying — may already be in place)
ALTER TABLE public.lectures
  ADD CONSTRAINT lectures_topic_id_fkey
  FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE SET NULL;
```

No new table. No column rename. No data deletion. Existing UI keeps working because `topic_id` stays nullable.

**Alternative if you prefer a dedicated table** (e.g. `lecture_topics` separate from the department-scoped `topics`): I can scaffold one — but it duplicates a concept that already exists. Recommend reuse.

## Backfill strategy — three options

| Option | Effort | Accuracy | Recommendation |
|---|---|---|---|
| **A. Manual tagging** via admin UI (dropdown on each lecture row) | High (214 rows) | 100% | Best for long-term quality |
| **B. AI inference** from title using existing Gemini infra (similar to "AI Assign Sections" tool) | Low | ~85% with review queue | **Recommended** — mirrors existing `concept_auto_assigned` / `concept_ai_confidence` pattern already in the schema |
| **C. Heuristic match** on lowercased title tokens against `topics.name` | Trivial | ~50% | Use as a first pass before B |

Recommended path: **C → B → A**. Run heuristic first to auto-tag obvious matches, run AI for the rest with a confidence score, then surface low-confidence rows in a review queue (reuse the "Tagging Issues" Control Center pattern). Add `topic_auto_assigned` and `topic_ai_confidence` columns mirroring the existing `concept_*` pattern.

## UI proposal — "All videos on this topic" modal

**Trigger**: in `src/components/content/LectureList.tsx` (line ~635, the title button), clicking the lecture **title** opens the modal instead of just playing inline. The existing play button stays for direct playback.

**New component**: `src/components/content/TopicVideosModal.tsx`
- Fetches all `lectures` where `topic_id = <clicked lecture's topic_id>` AND `is_deleted=false`, across all chapters and doctors
- Groups by `description` (doctor name)
- For each video shows: YouTube thumbnail (`https://i.ytimg.com/vi/<youtube_video_id>/mqdefault.jpg`), duration, doctor badge, chapter context, Play button
- Empty state if `topic_id` is null: "This lecture isn't tagged to a topic yet."

**New hook**: `src/hooks/useTopicLectures.ts` — `useTopicLectures(topicId)` returning lectures grouped by doctor.

**Layout** (matches existing dialog scrolling pattern with pinned header):

```text
┌─ All videos: Peptic Ulcer ─────────────×─┐
│ Dr. Hussein Khairy                       │
│ ┌────┐ Bleeding peptic ulcer    12:34 ▶ │
│ ┌────┐ Peptic Ulcer Complications 09:12 ▶│
│ Dr. Mohamed Elmasry                      │
│ ┌────┐ Peptic ulcer overview    15:02 ▶ │
└──────────────────────────────────────────┘
```

**Soft-gating for untagged lectures**: until backfill runs, untagged lectures (the majority) should still play inline as today — only show the modal when `topic_id` is present. Add a small "More videos on this topic" link only when ≥2 lectures share the topic.

## Files that will change (when approved)

- `supabase/migrations/<new>.sql` — index + FK (+ optional `topic_auto_assigned` columns)
- `src/components/content/LectureList.tsx` — title click handler
- `src/components/content/TopicVideosModal.tsx` — NEW
- `src/hooks/useTopicLectures.ts` — NEW
- `src/integrations/supabase/types.ts` — regenerated
- (Optional) `src/components/admin/AssignLectureTopicsTool.tsx` — admin AI backfill tool

## Open questions before I proceed

1. **Reuse `topics` table or create dedicated `lecture_topics`?** Recommend reuse.
2. **Backfill approach** — proceed with heuristic + AI (Option C+B) or wait for manual admin tagging?
3. **Doctor identity** — keep using `lectures.description` as plain text, or proper FK to `profiles`? (Out of scope for this prompt but flagging.)


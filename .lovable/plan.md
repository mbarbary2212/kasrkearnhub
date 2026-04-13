

## 4-Session Plan to Fix Progress & Counter Inconsistencies

### Session 1: Fix False "Mastered" on Fresh Accounts (Critical)

**Root cause**: `useNeedsPractice.ts` only tracks items the user got *wrong*. Zero attempts = zero wrong = "All mastered!"

**Changes**:
- `src/hooks/useNeedsPractice.ts` — add `attemptedCounts` to the return type. Query distinct `question_id` counts from `question_attempts` for MCQ and OSCE (not just incorrect ones). Add `mcqAttempted`, `osceAttempted` to `ContentCounts`. For matching/essay/cases, count from `userProgress` completed entries.
- `src/components/dashboard/DashboardNeedsPractice.tsx` — line 69-74: change each "all complete" check to require `attemptedCount > 0`. When `attemptedCount === 0`, show "Not started yet" with a neutral style instead of `AllClearBadge`.

---

### Session 2: Fix Socrates Counter + Persistence

**Root cause**: The tab badge (ChapterPage line 776) shows `guidedViewed/guidedTotal` — this counts **sets viewed** via `content_views`, not individual questions. Users read "1/24" as "1 question of 24" when it means "1 set of 24 sets."

**Changes**:
- `src/pages/ChapterPage.tsx` line ~820 — append " sets" to the counter label for `guided_explanations` tab so it reads "1/24 sets"
- `src/components/study/GuidedExplanationViewer.tsx` — persist `revealedAnswers` to `localStorage` keyed by resource ID so reopening a set restores prior progress instead of resetting to 0
- Same fix needed in `src/pages/TopicDetailPage.tsx` for the equivalent Socrates tab counter

---

### Session 3: Fix Chapter Count Mismatch (29 vs ~45)

**Root cause**: `useStudentDashboard.ts` line 304 filters out chapters with `totalItems === 0` for the coach count. But the student module page shows ALL chapters including empty ones.

**Changes**:
- In the module page chapter list component (ModulePage.tsx), filter out chapters with zero content items from the student view (not admin). This aligns what students see with what the coach counts.
- The merged surgery config (`expandModuleIds`) already handles SUR-423/523 correctly — no changes needed there.

---

### Session 4: Progress Weighting Clarity + Thumbnail Fallbacks

**Progress bar jump**: By design (40% video weight), but confusing without context.

**Changes**:
- `src/components/content/ChapterProgressBar.tsx` — add a small info icon with tooltip next to "Your progress in this chapter" that explains: "Progress = 60% Practice + 40% Videos. A single video can significantly impact your progress."
- Chapter card components — add a gradient + icon fallback for chapters without `image_url`, using a deterministic color based on chapter title hash (similar to existing module gradient system).

---

### Priority Order
1. Session 1 — false "mastered" is most misleading
2. Session 2 — Socrates counter confusion
3. Session 3 — chapter count alignment
4. Session 4 — polish (tooltips + thumbnails)


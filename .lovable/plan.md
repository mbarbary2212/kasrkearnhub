

# Plan: Material Engagement (Admin) + Weekly Summary & Chapter Time Invested (Student)

Three tightly scoped additions. **Critical first**: the time-tracking infrastructure (`useStudyTimeTracker.ts`, `study_time_events` table, `student_chapter_metrics.minutes_*` columns) already exists, but the hook is **never imported anywhere** — no time data is being collected today. So step 0 is to actually wire it up.

---

## Step 0 — Wire up the existing time tracker (prerequisite)

Without this, the rest is empty UI.

- Mount `useStudyTimeTracker(chapterId, moduleId, activityType, paused)` inside `ChapterPage.tsx` so every chapter visit collects time.
- Map current section → `activityType`:
  - `resources` (lecture/reading) → `'reading'` if no video active, `'watching'` if video player mounted
  - `interactive` → `'reading'`
  - `practice` → `'practicing'`
  - `test` → `'practicing'`
- Pass `paused = true` when no chapter is loaded or when a modal/dialog covers the page.
- The hook already handles idle detection (2 min), tab blur, and rolls up into `student_chapter_metrics` every 5 min — no changes needed there.

**Result**: `minutes_reading / watching / practicing / total` start populating per chapter per student.

---

## Step 1 — Student: chapter card "Time invested" soft signal

Tied to readiness, not raw time, exactly as you said.

- On the chapter list rows in `ModuleLearningTab.tsx` (next to `ChapterReadinessDot`), add an optional small label:
  - If `minutes_total >= 10` AND `readiness_score < 30` → `⏱ ~Xm · low return` (amber)
  - If `minutes_total >= 10` AND `readiness_score >= 70` → `⏱ ~Xm invested` (muted)
  - If `minutes_total < 10` → show nothing (avoids clutter for new chapters)
- Data source: `useStudentChapterMetrics` (already exists, already returns `minutes_total` + `readiness_score`). No new query.
- Rounded to nearest 5 min, capped at "2h+" to avoid huge numbers.
- New component `ChapterTimeInvested.tsx` (small, ~30 lines) for the label.

This makes time **meaningful** by pairing it with outcome — high time + low readiness is a coaching signal, not a brag.

---

## Step 2 — Student: "This week" summary card on Home dashboard

A single card in the right sidebar of `Home.tsx` (between existing widgets per `dashboard-home-sidebar-v1` memory).

Shows:
```
This week
─────────────────────
4h 20m studied · 6 chapters touched
🟦 1h 30m watching  🟧 1h 10m practicing  🟩 1h 40m reading
🔥 5-day streak · most time in: Cardiology Ch. 3
```

- New hook `useWeeklyStudySummary` that queries `study_time_events` for `session_date >= 7 days ago` for the current user.
- Aggregates by `activity_type` and counts distinct `chapter_id`.
- "Most time in" = chapter with highest sum of `duration_seconds` this week (joined with chapter title).
- Streak comes from existing `dashboard.studyStreak`.
- New component `WeeklyStudySummaryCard.tsx`.
- **No per-item breakdown** (deliberately) — keeps it motivational, not anxiety-inducing.

---

## Step 3 — Admin: Material Engagement dashboard

New tab under existing **Content Analytics** hub (route: `/admin?tab=content-analytics&section=engagement`).

### Data model (lightweight aggregate, NOT per-student-per-item)

We don't need a new table. A view + RPC over existing data is enough:

- **For videos / lectures**: aggregate `video_progress` rows → `views_count`, `unique_viewers`, `avg_percent_watched`, `completion_rate (≥80%)`.
- **For MCQs**: aggregate `question_attempts` → `attempts`, `unique_users`, `avg_time_per_question`, `accuracy`.
- **For flashcards**: aggregate `fsrs_reviews` → `reviews`, `unique_users`, `completion_rate`.
- **For chapters overall**: aggregate `study_time_events` → `total_minutes`, `unique_students`, `avg_minutes_per_student`.

Two new RPCs:
- `admin_material_engagement_videos(module_id, date_range)`
- `admin_material_engagement_mcqs(module_id, date_range)`
(Plus a chapter-level summary view that joins `student_chapter_metrics` aggregates.)

### UI: one table per material type, each row shows

| Material | Reach | Completion | Drop-off | Status |
|---|---|---|---|---|
| Lecture: Cardiac Cycle | 78% | 42% | avg 38% watched | 🟡 Opened but abandoned |
| MCQ: Aortic Stenosis | 12% | — | avg 3min/question | 🔴 Ignored + confusing |
| Flashcard set: Murmurs | 91% | 88% | — | 🟢 Working |

Status label rules (decision-driving, not vanity):
- 🟢 **Working** — reach ≥ 60% AND completion ≥ 70% (videos/flashcards) OR accuracy in healthy band (MCQs)
- 🟡 **Opened but abandoned** — reach ≥ 40% AND completion < 40%
- 🔴 **Ignored** — reach < 20% AND material has been published > 14 days
- ⚪ **Unused** — zero opens in date range
- ⚠️ **Confusing** — MCQ-only: avg time per question > 2× cohort median AND accuracy < 40%

Filters: module, date range (7/30/90 days), material type, status label.

Click row → opens existing **Content Navigation Bridge** to the source material (already built per memory).

### Critical exclusions (don't build)

- ❌ No per-student-per-material rows (privacy + low value, you agreed)
- ❌ No "leaderboard" of slow/fast students (wrong incentive)
- ❌ No raw "minutes spent" column on student-facing rows — engagement % only

---

## Files to create / modify

### Step 0 — wire tracker
| File | Change |
|---|---|
| `src/pages/ChapterPage.tsx` | Mount `useStudyTimeTracker` with derived `activityType` from section state |

### Step 1 — chapter time invested
| File | Change |
|---|---|
| `src/components/module/ChapterTimeInvested.tsx` | **New** — small label component |
| `src/components/module/ModuleLearningTab.tsx` | Render `<ChapterTimeInvested>` next to `<ChapterReadinessDot>` |

### Step 2 — weekly summary
| File | Change |
|---|---|
| `src/hooks/useWeeklyStudySummary.ts` | **New** — aggregate `study_time_events` for last 7 days |
| `src/components/dashboard/WeeklyStudySummaryCard.tsx` | **New** — sidebar card |
| `src/pages/Home.tsx` | Add card to right sidebar (per `dashboard-home-sidebar-v1` order) |

### Step 3 — admin material engagement
| File | Change |
|---|---|
| `supabase/migrations/<new>.sql` | RPCs: `admin_material_engagement_videos`, `admin_material_engagement_mcqs`, chapter-level summary view; super-admin/admin RLS |
| `src/hooks/admin/useMaterialEngagement.ts` | **New** — calls the RPCs |
| `src/components/admin/analytics/MaterialEngagementTab.tsx` | **New** — table UI + filters + status labels |
| `src/pages/admin/ContentAnalytics.tsx` (or equivalent) | Register new sub-tab `engagement` |

No new dependencies. Reuses existing tracker, existing tables, existing Content Navigation Bridge.

---

## Acceptance criteria

1. After visiting a chapter and being active for 1+ minute, `study_time_events` rows appear and `student_chapter_metrics.minutes_total` increases on rollup.
2. Idle (no input 2 min) or hidden tab pauses the timer — verified by console log / row counts.
3. Chapter list shows "⏱ ~25m · low return" only when both thresholds met; nothing shown for chapters with < 10 min.
4. Home dashboard sidebar shows accurate weekly totals split by activity type, refreshing on mount.
5. Admin Material Engagement table loads under Content Analytics, filterable by module + date range, with the 5 status labels rendered correctly.
6. Clicking a row deep-links to the underlying material via existing navigation bridge.
7. No per-student rows or leaderboards anywhere.
8. No regression to existing readiness, study plan, or chapter card behavior.

---

## What this deliberately does NOT do

- No per-MCQ stopwatch shown to students.
- No "you spent X minutes on question Y" data points.
- No new realtime tracking — uses the existing 30s heartbeat / 60s flush / 5min rollup pipeline.
- No backfill of historical data (we only have data going forward; admin dashboard will read empty for the first week, which is honest).


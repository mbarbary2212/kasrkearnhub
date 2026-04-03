

# Adaptive System Completion: Time Tracking, Planner Sync, Exam Mode, Plan Continuity

## Summary

Extend the existing adaptive engine with 4 capabilities: real time-on-task tracking, planner-to-metrics sync, exam countdown priority scaling, and multi-day plan persistence with carry-over. All critical fixes from the review are incorporated.

---

## Architecture Principles

- `study_plans` remains the **single source of configuration** (exam_date, preferences)
- New `daily_study_plans` stores only **generated daily outputs** — never planning rules
- Completion thresholds are extracted to a **configurable constants file**, not hardcoded
- All priority scores are **capped at 200** after multipliers to prevent runaway values
- Carry-over tasks are limited: max 2, priority > 80, carried only once

---

## Phase 1: Database Migration

### New table: `study_time_events`
Heartbeat-based time accumulator. One row per flush (max 1/minute).

```sql
CREATE TABLE public.study_time_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.module_chapters(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('reading','watching','practicing','cases')),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  first_active_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_study_time_user_chapter_date ON study_time_events(user_id, chapter_id, session_date);
-- RLS: users see/insert own rows only
```

### New table: `daily_study_plans`
Persisted daily plan output (not configuration).

```sql
CREATE TABLE public.daily_study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  exam_mode TEXT DEFAULT 'normal' CHECK (exam_mode IN ('normal','moderate','intensive')),
  plan_label TEXT,
  tasks_completed INTEGER DEFAULT 0,
  tasks_total INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, plan_date, module_id)
);
```

### New table: `daily_study_plan_tasks`
Individual tasks within a daily plan.

```sql
CREATE TABLE public.daily_study_plan_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.daily_study_plans(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.module_chapters(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partial','completed','skipped')),
  is_carried_over BOOLEAN NOT NULL DEFAULT false,
  carry_count INTEGER NOT NULL DEFAULT 0,
  priority NUMERIC NOT NULL DEFAULT 0,
  estimated_minutes INTEGER DEFAULT 15,
  completion_percent INTEGER DEFAULT 0,
  prescribed_study_mode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Alter `study_plans`
Add exam_date column to the existing configuration table.

```sql
ALTER TABLE public.study_plans ADD COLUMN IF NOT EXISTS exam_date DATE;
```

All tables get RLS: authenticated users can only read/write their own rows.

---

## Phase 2: Configurable Thresholds

**New file: `src/lib/studentMetrics/plannerThresholds.ts`**

Extract all tunable constants into one place:

```text
MCQ_COMPLETION_THRESHOLD = 10
COVERAGE_COMPLETION_THRESHOLD = 80
READINESS_COMPLETION_THRESHOLD = 60
PARTIAL_MCQ_THRESHOLD = 3
MAX_CARRY_OVER_TASKS = 2
CARRY_OVER_MIN_PRIORITY = 80
MAX_CARRY_COUNT = 1
PRIORITY_CAP = 200
MIN_PROGRESS_TASKS_UNLESS_EXAM_CRITICAL = 1
EXAM_CRITICAL_DAYS = 3
```

These can later be moved to admin-configurable settings without touching logic.

---

## Phase 3: Time-on-Task Tracking

**New file: `src/hooks/useStudyTimeTracker.ts`**

- Accepts `chapterId`, `moduleId`, `activityType`
- 30-second heartbeat interval
- Pauses on: `document.hidden`, window blur, idle > 2 min (no mouse/key)
- Records `first_active_at` on first heartbeat of a session
- Accumulates seconds in-memory; flushes to `study_time_events` only when >= 60 seconds accumulated (max 1 write/min)
- On unmount, flushes remaining accumulated time

**Rollup utility: `src/lib/studentMetrics/rollupStudyTime.ts`**

- Queries `study_time_events` grouped by `activity_type` for a user+chapter
- Updates `student_chapter_metrics` columns: `minutes_reading`, `minutes_watching`, `minutes_practicing`, `minutes_total`
- Triggered ONLY on: page exit (unmount) or every 5 minutes (debounced) — NOT on every heartbeat

**Integration points** (minimal changes to existing files):
- `ChapterPage.tsx` resources tab: `useStudyTimeTracker(chapterId, moduleId, 'reading')`
- Video player: track `watching` (pause on video pause)
- MCQ/OSCE practice views: track `practicing`
- Clinical cases: track `cases`

Each is a single hook call — no UI changes needed.

---

## Phase 4: Planner Connected to Real Progress

**Modify: `src/lib/studentMetrics/buildAdaptiveStudyPlan.ts`**

Add to `AdaptivePlanInput`:
```typescript
examDate?: Date;
previousPlanTasks?: PreviousPlanTask[];
```

**Task completion sync logic** (uses thresholds from Phase 2):
- Check each chapter's `student_chapter_metrics` against thresholds
- If `mcq_attempts >= MCQ_COMPLETION_THRESHOLD` or `coverage_percent >= COVERAGE_COMPLETION_THRESHOLD` → task status = `completed`
- If some attempts but below threshold → `partial` with computed `completion_percent`

**New file: `src/hooks/useDailyStudyPlan.ts`**

- On mount: check `daily_study_plans` for today + current filters
- If exists: load tasks, sync statuses against current `student_chapter_metrics`
- If not: call `buildAdaptiveStudyPlan()`, persist result to `daily_study_plans` + `daily_study_plan_tasks`
- Expose `markTaskStatus(taskId, status)` for manual overrides
- Compute plan adherence: `tasks_completed / tasks_total` ratio (stored on daily plan row)

---

## Phase 5: Exam Countdown Mode

**Modify: `buildAdaptiveStudyPlan.ts`**

Read `examDate` from input. Compute `daysUntilExam` and classify tier:

| Factor | Normal (>30d) | Moderate (8-30d) | Intensive (0-7d) |
|--------|---------------|------------------|------------------|
| Weakness boost | 1.0x | 1.3x | 1.6x |
| Overdue review boost | 1.0x | 1.2x | 1.5x |
| Exam weight cap | 2.0x | 2.5x | 3.0x |
| Progress slot base priority | 75 | 60 | 40 |

**Safety rails:**
- Final priority capped at `PRIORITY_CAP` (200) after all multipliers
- At least 1 progress task remains unless `daysUntilExam < EXAM_CRITICAL_DAYS` (3)
- Update `derivePlanLabel()` to include exam context: "Exam prep — 5 days left"

**Data source:** Read `exam_date` from `study_plans` via `useStudyPlan`, pass through `useStudentDashboard` into `buildAdaptiveStudyPlan`.

---

## Phase 6: Multi-Day Plan Continuity

**In `useDailyStudyPlan.ts`:**

When generating today's plan:
1. Query yesterday's `daily_study_plan_tasks` where `status IN ('pending', 'partial')`
2. Filter: `priority > CARRY_OVER_MIN_PRIORITY` AND `carry_count < MAX_CARRY_COUNT`
3. Take top `MAX_CARRY_OVER_TASKS` (2) by priority
4. Insert as today's tasks with `is_carried_over = true`, `carry_count = carry_count + 1`
5. Fill remaining slots with fresh adaptive tasks

This ensures carried tasks never loop infinitely (max carry once) and don't overwhelm the plan.

---

## Phase 7: Minimal UI Updates

**Modify: `src/components/dashboard/DashboardTodayPlan.tsx`**

Small additions only:
- Task status indicators: checkmark (completed), half-circle (partial), dot (pending)
- "Carried over" subtle label on carried tasks (small badge)
- Exam mode pill when active: "Exam in N days" in the header
- Plan adherence: "2/3 completed yesterday" small text below rationale

**Modify: `src/hooks/useStudentDashboard.ts`**
- Fetch `exam_date` from `study_plans` for current year
- Pass `examDate` and `previousPlanTasks` into `buildAdaptiveStudyPlan`
- Wire up `useDailyStudyPlan` as the source for dashboard plan data

**Optional: Exam date input**
- Small date picker in the existing yearly planner settings (`useStudyPlan`), saving to `study_plans.exam_date`

---

## Files Summary

| File | Action |
|------|--------|
| Migration SQL | 3 new tables + `exam_date` column + RLS |
| `src/lib/studentMetrics/plannerThresholds.ts` | **New** — configurable constants |
| `src/hooks/useStudyTimeTracker.ts` | **New** — heartbeat time tracker |
| `src/lib/studentMetrics/rollupStudyTime.ts` | **New** — debounced rollup to metrics |
| `src/hooks/useDailyStudyPlan.ts` | **New** — persistent daily plan with carry-over |
| `src/lib/studentMetrics/buildAdaptiveStudyPlan.ts` | **Modify** — exam mode, priority cap, carry-over input, threshold imports |
| `src/hooks/useStudentDashboard.ts` | **Modify** — pass exam date, wire daily plan |
| `src/components/dashboard/DashboardTodayPlan.tsx` | **Modify** — status indicators, exam badge, carry-over label |
| `src/pages/ChapterPage.tsx` + practice components | **Modify** — add `useStudyTimeTracker` calls |

## What Does NOT Change
- Readiness score formula (in RPC)
- FSRS flashcard scheduling
- Chapter classification logic
- Blueprint weight system
- Admin UI
- Student page layouts (beyond small indicator additions)
- `study_plans` table role as configuration source


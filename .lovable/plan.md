## Goal
Give admins a clear picture of how each student uses the app: total time, session frequency, which modules and chapters they hit most, and how their time splits between reading, video, MCQ practice, and flashcards. Available both as an in-app view and as an Excel export.

## Data sources (already in the DB — no schema changes)
- `user_sessions` — session_start, last_seen_at, duration_seconds → total time on app, sessions, last seen, active days
- `study_time_events` — user_id, module_id, chapter_id, activity_type, duration_seconds, session_date → time per module / chapter / activity type, daily curve
- `content_views` — content_type, chapter_id, topic_id → which content types opened (backup signal)
- `question_attempts` — practice attempts count (secondary metric)
- `modules`, `module_chapters` — names for display

No new tables, no new RLS. Reads only.

## What I'll build

### 1. New hooks
- `src/hooks/useStudentUsageOverview.ts` — one query per metric, joined client-side, returns a row per student:
  - `total_time_all`, `total_time_30d`, `total_time_7d` (from `user_sessions`)
  - `sessions_30d`, `active_days_30d`, `last_seen`
  - `top_module_name`, `top_module_minutes` (from `study_time_events`)
  - `mcq_attempts_30d`
- `src/hooks/useStudentUsageDetail.ts` — for one `userId`:
  - Session stats (total, average length, longest, last 30 days daily buckets for a sparkline)
  - Per-module minutes (all-time and 30d)
  - Top 10 chapters by minutes (with module name)
  - Activity-type split: reading vs watching vs practicing vs flashcards (from `study_time_events.activity_type`, plus derived counts from `content_views` and `question_attempts` as sanity check)
  - Daily activity for last 30/90 days (for a small line chart)

### 2. New admin subtab: "Usage"
- `src/components/admin/UsageTab.tsx` added under the existing System / Accounts area (next to Accounts). Sortable table:
  - Columns: Name, Email, Role, Last seen, Sessions (30d), Active days (30d), Total time (30d), Total time (all), Top module, Actions
  - Row action: **View report** → opens the detail dialog
  - Header button: **Export to Excel** — same pattern as the access-requests export I just added
- Registered in the existing admin tabs config so it picks up the sticky header behavior already in place.

### 3. Per-student detail dialog: `StudentUsageReportDialog.tsx`
Reusable dialog opened from:
- the new Usage table row action, and
- the existing Accounts row (adds a "View usage" item to the row's actions)

Content:
- Header: student name, role, last seen, streak
- Summary cards: Total time (all / 30d / 7d), Sessions (30d), Avg session length, Active days (30d)
- Small daily-minutes line chart (last 30 days) using `recharts` (already a project dep)
- Table: Time per module (30d + all-time, sorted desc)
- Table: Top 10 chapters (module → chapter → minutes → last activity)
- Donut / stacked bar: Activity-type split (Reading / Videos / Practice / Flashcards)
- Footer button: **Export this student's report to Excel**

### 4. Excel exports (uses ExcelJS, already a dep)
- `src/lib/exportStudentUsageOverview.ts` — all-students sheet mirroring the table above.
- `src/lib/exportStudentUsageDetail.ts` — one workbook per student with sheets:
  - `Summary` (all headline metrics)
  - `Daily Activity` (date, minutes, sessions) — chartable in Excel
  - `Modules` (module, minutes 30d, minutes all-time)
  - `Chapters` (module, chapter, minutes, last activity)
  - `Activity Split` (activity_type, minutes, %)

### 5. Small UX polish
- Time formatted as `Xh Ym` in the UI, raw minutes as numbers in Excel (so you can chart).
- Empty-state messaging when a student has no recorded sessions yet.
- Loading skeletons.

## Out of scope
- No new tracking; we use what `useSessionTracking` and `useStudyTimeTracker` already record.
- No changes to RLS, no schema migrations.
- No cross-student comparisons or cohort analytics in this pass (call it out if you want it next).
- No email/scheduled reports.

## Files touched
New:
- `src/hooks/useStudentUsageOverview.ts`
- `src/hooks/useStudentUsageDetail.ts`
- `src/components/admin/UsageTab.tsx`
- `src/components/admin/StudentUsageReportDialog.tsx`
- `src/lib/exportStudentUsageOverview.ts`
- `src/lib/exportStudentUsageDetail.ts`

Edited:
- `src/pages/AdminPage.tsx` (or the admin tabs config file) — register the new Usage subtab.
- `src/components/admin/AccountsTab.tsx` — add "View usage" action on each row that opens the detail dialog.

## Verification
- Typecheck.
- Manually open Admin → Usage, sort by 30d time, open one student, export overview + detail Excel, verify sheets open cleanly.

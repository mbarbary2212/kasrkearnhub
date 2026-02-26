

## Plan: AI Cases Analytics Tab in Admin Panel

### Database Migration
- Add `flag_reason` text column to `virtual_patient_attempts` (for manual flagging with reason)
- Add `time_spent_seconds` column to `virtual_patient_attempts` (already has `time_taken_seconds` — reuse that instead, no new column needed)
- Create `ai_case_attempt_summary` view joining attempts, cases, profiles, and ai_case_messages — computes `duration_seconds`, `estimated_cost_usd`, `message_count`, `debrief_summary`
- Note: `difficulty` column is actually `level` in `virtual_patient_cases`; the view will use `level`

### Admin Navigation Update
**File: `src/components/admin/AdminTabsNavigation.tsx`**
- Add "AI Cases" tab under Content group, visible to `isSuperAdmin || isPlatformAdmin || isModuleAdmin || isTopicAdmin`

### New Hook: `src/hooks/useAICaseAdmin.ts`
- `useAICaseAttempts(filters, roleScope)` — queries the `ai_case_attempt_summary` view with role-scoped filtering:
  - superadmin/platform_admin: no scope filter
  - module_admin: filter by `module_id IN (managed modules)`
  - topic_admin: filter by `topic_id IN (assigned topics)`
- `useAICaseSummaryStats(filters, roleScope)` — aggregates: total attempts, avg score, flagged count, total cost
- `useAICaseTranscript(attemptId)` — fetches full `ai_case_messages` for a given attempt
- `useAICasesInScope(roleScope)` — fetches case list for filter dropdown
- `useFlagAttempt()` — mutation to set `flag_for_review = true` + `flag_reason`

### New Component: `src/components/admin/AICasesAdminTab.tsx`
Three sections:
1. **Summary Stats Bar** — 4 cards: Total Attempts, Avg Score (color-coded), Flagged Sessions (red badge), Total Cost ($)
2. **Filters Bar** — Case dropdown, Difficulty (All/Beginner/Intermediate/Advanced), Score min/max, Flagged toggle, Date range, Student search. Reset button.
3. **Attempts Table** — Sortable, paginated (10/page). Columns: Student (name+email), Case (title+level badge), Score (color-coded), Time Spent, Turns, Cost, Flagged icon, Started (relative), "View Transcript" button. Flagged rows get red left border. Default sort: Started desc.

### New Component: `src/components/admin/AICaseTranscriptModal.tsx`
- Full-height right side Sheet
- Header: student name, case title, score badge, flag badge, date
- Stats row: duration, turns, cost, completion status
- Debrief summary card (teal) if completed
- Scrollable chat transcript with turn dividers:
  - System messages: teal clinical card
  - Examiner: left grey bubble
  - Student: right primary bubble
- Flag button (for module_admin+) with reason input
- Export/print button

### Admin Page Wiring
**File: `src/pages/AdminPage.tsx`**
- Import and render `<AICasesAdminTab>` for the `ai-cases` tab value
- Pass role info and module scope

### Empty States
- No attempts: illustration + message
- No flagged: green checkmark
- Filters empty: "No results" + Reset



# Final Exam Simulation System — Implementation Plan

## Concept

A **simulation window** opens ~1 month before finals. Students can start any paper at any time within the window, but once started the paper is strictly timed and mimics the real final exam structure. This is formative (practice), not summative — students get instant results.

---

## Database Schema (10 Tables)

### 1. `exam_blueprints` — Editable Draft

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| module_id | uuid FK → modules | |
| name | text | e.g. "Surgery Final 2026" |
| description | text | |
| status | text | `draft` / `published` / `archived` |
| created_by | uuid | |
| updated_by | uuid | |
| created_at / updated_at | timestamptz | |

### 2. `exam_papers` — Papers Within Blueprint

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| blueprint_id | uuid FK | |
| name | text | "Written Paper 1", "OSCE" |
| category | text | `written` / `practical` |
| paper_order | int | Sequence |
| duration_minutes | int | Strict time limit |
| total_marks | int | Max marks for this paper |
| instructions | text | Shown before start |
| allow_backtrack | bool | Default true for written |
| created_at / updated_at | timestamptz | |

### 3. `exam_paper_components` — Question Types Within Paper

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| paper_id | uuid FK | |
| question_type | text | `mcq` / `essay` / `osce` / `clinical_case` |
| question_count | int | How many to pull |
| points_per_question | numeric | Marks each |
| component_order | int | |
| source_filters | jsonb | `{ difficulty, tags, exclude_ids, require_image }` |

### 4. `exam_paper_chapters` — Chapter Scope

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| paper_id | uuid FK | |
| chapter_id | uuid FK → module_chapters | |

### 5. `exam_blueprint_versions` — Immutable Snapshot on Publish

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| blueprint_id | uuid FK | |
| version_number | int | Auto-increment per blueprint |
| snapshot | jsonb | Frozen papers/components/chapters |
| published_by | uuid | |
| published_at | timestamptz | |

### 6. `exam_runs` — Simulation Window

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| blueprint_version_id | uuid FK | Locked to version |
| module_id | uuid FK | |
| name | text | "Final Exam Sim — Jan 2026" |
| opens_at | timestamptz | Window opens (e.g. 1 month before finals) |
| closes_at | timestamptz | Window closes |
| max_attempts | int | Default 1 |
| show_results | bool | True = instant results (simulation mode) |
| question_seed | bigint | Deterministic randomization base |
| created_by | uuid | |
| created_at / updated_at | timestamptz | |

**Key**: No per-paper schedule. Students can start any paper any time within `opens_at` → `closes_at`. Once started, the paper's `duration_minutes` is enforced strictly.

### 7. `exam_attempts` — Student Attempt per Paper

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| run_id | uuid FK → exam_runs | |
| paper_index | int | Which paper (index into snapshot) |
| question_ids | uuid[] | Ordered list of sourced questions |
| started_at | timestamptz | |
| submitted_at | timestamptz | |
| auto_submitted | bool | True if timer expired |
| duration_seconds | int | |
| total_score | numeric | Computed after grading |
| total_possible | numeric | |
| status | text | `in_progress` / `submitted` / `graded` |

### 8. `exam_attempt_answers` — Normalized Answers (Option A)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| attempt_id | uuid FK → exam_attempts | |
| question_id | uuid | Source question ID |
| question_type | text | `mcq` / `essay` / `osce` / `clinical_case` |
| answer | jsonb | `{ selected_key }` for MCQ, `{ text }` for essay, `{ answers: bool[] }` for OSCE |
| is_correct | bool | Auto-set for MCQ/OSCE |
| score | numeric | Points awarded |
| max_score | numeric | Points possible |
| answered_at | timestamptz | |

### 9. `exam_question_analytics` — Materialized Per-Question Stats

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| run_id | uuid FK | |
| question_id | uuid | |
| question_type | text | |
| attempt_count | int | Times presented |
| correct_count | int | Times answered correctly |
| avg_score | numeric | |
| discrimination_index | numeric | Point-biserial correlation |
| updated_at | timestamptz | |

### 10. `exam_run_analytics` — Cohort-Level Stats

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| run_id | uuid FK | |
| paper_index | int | |
| total_students | int | |
| mean_score | numeric | |
| median_score | numeric | |
| std_deviation | numeric | |
| pass_rate | numeric | % above pass mark |
| updated_at | timestamptz | |

---

## RLS Policies

### Admin Access (blueprints, papers, components, chapters, versions, runs)
```sql
-- Module admins can manage blueprints for their modules
CREATE POLICY "module_admins_manage_blueprints" ON exam_blueprints
  FOR ALL USING (
    module_id IN (SELECT module_id FROM module_admins WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('platform_admin','super_admin'))
  );
```
Same pattern for papers, components, chapters, versions, runs.

### Student Access
```sql
-- Students can read runs within their module that are currently open
CREATE POLICY "students_read_open_runs" ON exam_runs
  FOR SELECT USING (
    opens_at <= now() AND closes_at >= now()
  );

-- Students can CRUD their own attempts
CREATE POLICY "students_own_attempts" ON exam_attempts
  FOR ALL USING (user_id = auth.uid());

-- Students can CRUD their own answers
CREATE POLICY "students_own_answers" ON exam_attempt_answers
  FOR ALL USING (
    attempt_id IN (SELECT id FROM exam_attempts WHERE user_id = auth.uid())
  );
```

### Analytics
```sql
-- Only admins read analytics tables
CREATE POLICY "admins_read_analytics" ON exam_question_analytics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('platform_admin','super_admin','teacher'))
  );
```

---

## Question Sourcing Algorithm

When student starts a paper:

1. Read paper snapshot from `exam_blueprint_versions.snapshot[paper_index]`
2. For each component:
   - Query source table (mcqs/essays/osce_questions/etc.) filtered by:
     - `chapter_id IN (paper's chapter scope)`
     - `is_deleted = false`
     - `source_filters` from component (difficulty, tags, require_image, exclude_ids)
   - Deterministic shuffle: `seed = exam_run.question_seed XOR hash(user_id)`
   - Select top `question_count` items
3. Store selected `question_ids` array in `exam_attempts`
4. Return questions to client in order

---

## Auto-Scoring

- **MCQ**: Compare `answer.selected_key` with `mcqs.correct_key` → `is_correct`, `score = points_per_question`
- **OSCE**: Compare `answer.answers[]` with `osce_questions.answer_1..5` → partial score
- **Essay**: Not auto-scored in simulation mode; show model answer for self-review; `score = null`
- **Clinical Case**: Show model progression; `score = null`

---

## UI Components

### Admin

| Component | File | Purpose |
|---|---|---|
| ExamBlueprintBuilder | `src/components/exam/blueprint/ExamBlueprintBuilder.tsx` | Create/edit blueprint with papers |
| ExamPaperEditor | `src/components/exam/blueprint/ExamPaperEditor.tsx` | Edit single paper: components, chapters, marks |
| ExamComponentRow | `src/components/exam/blueprint/ExamComponentRow.tsx` | Configure one question type |
| ExamChapterSelector | `src/components/exam/blueprint/ExamChapterSelector.tsx` | Multi-select chapters |
| ExamPublishDialog | `src/components/exam/blueprint/ExamPublishDialog.tsx` | Publish → create immutable version |
| ExamRunWizard | `src/components/exam/runs/ExamRunWizard.tsx` | Create simulation window |
| ExamRunAnalytics | `src/components/exam/runs/ExamRunAnalytics.tsx` | Cohort stats + question quality |

### Student

| Component | File | Purpose |
|---|---|---|
| ExamSimDashboard | `src/components/exam/student/ExamSimDashboard.tsx` | Show open windows, paper list, start buttons |
| ExamPaperRunner | `src/components/exam/student/ExamPaperRunner.tsx` | Timed paper execution |
| ExamMcqQuestion | `src/components/exam/student/ExamMcqQuestion.tsx` | MCQ within paper (reuse MockExamQuestion style) |
| ExamEssayQuestion | `src/components/exam/student/ExamEssayQuestion.tsx` | Text input with word count |
| ExamOsceStation | `src/components/exam/student/ExamOsceStation.tsx` | OSCE station (reuse OsceExamQuestion style) |
| ExamResults | `src/components/exam/student/ExamResults.tsx` | Instant results + score breakdown |
| ExamResultsExport | `src/components/exam/student/ExamResultsExport.tsx` | CSV/PDF export |

### Hooks

| Hook | File | Purpose |
|---|---|---|
| useExamBlueprints | `src/hooks/useExamBlueprints.ts` | CRUD blueprints/papers/components, publish |
| useExamRuns | `src/hooks/useExamRuns.ts` | Create/manage simulation windows |
| useExamAttempts | `src/hooks/useExamAttempts.ts` | Start paper, save answers, submit, auto-submit |
| useExamResults | `src/hooks/useExamResults.ts` | Fetch results + analytics |

---

## Integration

- **ModuleFormativeTab.tsx**: Add "Final Exam Simulation" card below mock exam. Admin sees blueprint builder link. Students see open simulation windows.
- **exam/index.ts**: Export new components.
- Existing practice/mock exams unchanged.

---

## Implementation Phases

### Phase 1: Database Migration + RLS
- Create all 10 tables with proper constraints and RLS policies
- Audit logging integration

### Phase 2: Admin Blueprint Builder
- useExamBlueprints hook
- Blueprint Builder UI: create blueprint, add/edit papers, configure components, select chapters
- Publish flow → immutable version

### Phase 3: Admin Exam Run Wizard
- useExamRuns hook
- Create simulation window: select version, set opens_at/closes_at
- Run management (view status, close early)

### Phase 4: Student Dashboard + Paper Runner
- useExamAttempts hook
- ExamSimDashboard: list open windows, paper cards with status
- ExamPaperRunner: timer, question navigation, answer saving, auto-submit
- Question sourcing with deterministic seed

### Phase 5: Auto-Scoring + Results
- MCQ/OSCE auto-scoring on submission
- ExamResults: instant score breakdown
- ExamResultsExport: CSV download

### Phase 6: Analytics
- useExamResults hook
- Question-level analytics (difficulty, discrimination)
- Cohort analytics (mean, median, pass rate)
- Admin analytics dashboard

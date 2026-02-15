

## Exam Results, Marking, and Rechecking System

This plan adds a complete post-exam workflow: auto-marking essays with the existing rubric engine, displaying results for students with a rechecking request option, and giving admins a dashboard to review all student attempts.

---

### Current State

- `mock_exam_attempts` stores each attempt (user_id, module_id, score, duration, etc.) but lacks paper-level metadata
- `exam_attempt_answers` stores per-question answers with `score`, `max_score`, `question_type` fields (already supports essay scoring)
- MCQ scoring is already done at submit time; essay scoring returns 0 (comment in code: "Essay scoring would be done later")
- `MockExamResults` only shows MCQ review; no essay results
- No rechecking/appeal system exists
- Question Analytics already covers MCQ, OSCE, and Matching in the admin panel

---

### Database Changes

**1. Add `paper_index` to `mock_exam_attempts`**
Track which paper within a module the attempt belongs to.

```sql
ALTER TABLE mock_exam_attempts
ADD COLUMN paper_index integer DEFAULT 0;
```

**2. Add essay marking fields to `exam_attempt_answers`**
Store rubric-based auto-marking details.

```sql
ALTER TABLE exam_attempt_answers
ADD COLUMN marking_feedback jsonb DEFAULT NULL,
ADD COLUMN marked_at timestamptz DEFAULT NULL;
```

**3. Create `exam_recheck_requests` table**
Allow students to request rechecking of specific answers.

```sql
CREATE TABLE exam_recheck_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES mock_exam_attempts(id),
  answer_id uuid NOT NULL REFERENCES exam_attempt_answers(id),
  user_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_response text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE exam_recheck_requests ENABLE ROW LEVEL SECURITY;

-- Students can create and view their own requests
CREATE POLICY "Students manage own recheck requests"
ON exam_recheck_requests FOR ALL
USING (user_id = auth.uid());

-- Admins can view and update all requests
CREATE POLICY "Admins manage all recheck requests"
ON exam_recheck_requests FOR ALL
USING (is_platform_admin_or_higher(auth.uid()));
```

---

### Auto-Marking Essays on Submit

**File: `src/components/exam/BlueprintExamRunner.tsx`**

When the exam is submitted, before calling `submitExam.mutateAsync`, run the rubric engine against each essay answer:

- For each essay item, fetch the essay's `keywords` (already loaded as `Essay.keywords`)
- Build a simple rubric from keywords and call `gradeWithRubric()` from `src/lib/rubricMarking.ts`
- Calculate score as `(matched_required / total_required) * max_score`
- Update `exam_attempt_answers` with `score`, `max_score`, `marking_feedback` (matched/missing concepts), and `marked_at`
- Add essay scores to the total score before submitting the attempt

---

### Enhanced Results View

**File: `src/components/exam/MockExamResults.tsx`**

Extend the existing results component to handle both MCQs and essays:

- Accept essay answers and essay data as new props
- Add an "Essays" section below the MCQ review accordion
- For each essay: show the question, the student's typed answer, the auto-mark score, matched/missing keywords with green/red badges
- Add a "Request Rechecking" button on each essay answer card that opens a modal to submit a reason

**New file: `src/components/exam/RecheckRequestModal.tsx`**

A simple dialog with:
- The question title and current score displayed
- A textarea for the student's reason
- Submit button that inserts into `exam_recheck_requests`

---

### Student View - Previous Attempts (Inside Formative Tab)

**File: `src/components/module/ModuleFormativeTab.tsx`**

The "Previous Attempts" section already exists at the bottom of the student view. Enhance it:

- Show paper name alongside the score
- Add a "View Results" button on each attempt that navigates to `/module/:moduleId/exam-results/:attemptId`
- Show separate MCQ score and Essay score breakdowns

**New file: `src/pages/ExamResultsPage.tsx`**

A dedicated page that:
- Fetches the attempt by ID from `mock_exam_attempts`
- Fetches all `exam_attempt_answers` for that attempt
- Fetches the corresponding MCQ and Essay data
- Renders the enhanced `MockExamResults` component
- Shows any existing recheck requests and their status

**File: `src/App.tsx`**

Add route: `/module/:moduleId/exam-results/:attemptId`

---

### Admin View - Exam Attempts Dashboard

**File: `src/components/module/ModuleFormativeTab.tsx`** (Admin section)

Add a third primary tab alongside "Written" and "Practical": **"Results"**

This tab shows:
- A table of all student attempts for this module (fetched without user_id filter)
- Columns: Student Name, Paper, Score (MCQ + Essay), Date, Duration, Status
- Click a row to expand and see per-question breakdown
- Filter by paper, date range
- Recheck requests section: list of pending requests with Approve/Reject actions

**New hook: `src/hooks/useExamResults.ts`**

- `useModuleExamAttempts(moduleId)` - admin: all attempts for module (joins profiles for student name)
- `useExamAttemptAnswers(attemptId)` - fetch all answers for an attempt
- `useRecheckRequests(moduleId)` - admin: all recheck requests for module
- `useSubmitRecheckRequest()` - student mutation
- `useResolveRecheckRequest()` - admin mutation

---

### Analytics Integration

**File: `src/hooks/useMcqAnalytics.ts`**

The existing MCQ analytics already track per-question performance from `question_attempts`. The blueprint exam's MCQ answers are saved to `exam_attempt_answers`, which is a separate table. To integrate:

- After exam submission, also insert records into the existing `question_attempts` table for each MCQ answered in the exam, so they appear in the MCQ Analytics dashboard automatically
- This keeps analytics unified: practice MCQs and exam MCQs all feed the same analytics pipeline

---

### Files to Create
- `src/pages/ExamResultsPage.tsx` - Detailed results page for a single attempt
- `src/components/exam/RecheckRequestModal.tsx` - Rechecking request dialog
- `src/hooks/useExamResults.ts` - Data hooks for results, answers, and recheck requests

### Files to Modify
- `src/components/exam/BlueprintExamRunner.tsx` - Add essay auto-marking on submit, save to question_attempts
- `src/components/exam/MockExamResults.tsx` - Add essay review section and recheck button
- `src/components/module/ModuleFormativeTab.tsx` - Enhance student attempts list; add admin "Results" tab
- `src/App.tsx` - Add exam results route
- `src/hooks/useMockExam.ts` - Update attempt query to include paper_index

### Database Migration
- Add `paper_index` column to `mock_exam_attempts`
- Add `marking_feedback`, `marked_at` columns to `exam_attempt_answers`
- Create `exam_recheck_requests` table with RLS policies


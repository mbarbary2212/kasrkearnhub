

## Add Per-Question Detail View with Exam Type to Admin Results

### What Changes

1. **Add "Exam Type" column** to the existing attempts table so admins can see whether each attempt was Easy, Hard, or Blueprint mode
2. **Make rows clickable** -- clicking opens a detail modal showing the full question-by-question breakdown for that student
3. **New component** to render the detail modal with MCQ review and essay review

### Attempts Table Enhancement

The `test_mode` column already exists on `mock_exam_attempts` (values: `easy`, `hard`, `blueprint`). A new "Type" column will display this as a styled badge (e.g., green for Easy, amber for Hard, blue for Blueprint).

### Detail Modal: `AdminAttemptDetailModal.tsx`

When an admin clicks a row, a full-screen dialog opens showing:

- **Header**: Student name, exam type badge, overall score %, duration, date
- **MCQ Section**: Fetches question data from `mcqs` table using `question_ids` from the attempt. Displays each question with the student's selected answer (from `user_answers` JSONB) highlighted -- green for correct, red for incorrect -- plus the explanation. Uses the same visual pattern as `MockExamResults`.
- **Essay Section**: Fetches answers from `exam_attempt_answers` and essay questions from `essays` table. Shows the student's typed response, score, matched/missing concepts -- same pattern as `EssayResultsSection` but without the recheck button (admin view).

### Data Flow

For MCQ-based attempts (easy/hard mode), answers are stored in `mock_exam_attempts.user_answers` (JSONB mapping question_id to selected key). The question IDs come from `mock_exam_attempts.question_ids` (array).

For blueprint attempts with essays, individual answers also exist in `exam_attempt_answers` with scoring metadata.

### Files

| File | Change |
|------|--------|
| `src/components/exam/AdminAttemptDetailModal.tsx` | **New** -- Detail modal fetching MCQ questions + essay answers and rendering full review |
| `src/components/exam/AdminExamResultsTab.tsx` | Add "Type" column, make rows clickable, render detail modal |
| `src/components/exam/index.ts` | Export new component |

No database changes needed. All data already exists.


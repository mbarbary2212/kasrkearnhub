

## Student Q&A System — Plan

### What It Is
A lightweight Q&A feature where students can ask questions about chapter content. The system surfaces the **most frequently asked questions** (aggregated across all students) and lets students submit new questions. Think of it as a "community FAQ" that builds itself.

### Where It Lives

1. **Chapter Page** — A new **"Q&A"** subtab inside both the **Resources** and **Practice** sections (or as a floating widget at the bottom of each section). Since Q&A applies to the whole chapter rather than a specific subtab, a cleaner approach is to add it as a **collapsible card at the bottom of the chapter page**, visible across all sections — similar to how the Discussion section works.

2. **Home Dashboard** — A small card in the right column showing "Top unanswered questions" or "Trending questions this week" to drive engagement.

### Database

New table: `chapter_questions`
- `id` (uuid, PK)
- `chapter_id` (uuid, FK to module_chapters)
- `module_id` (uuid, FK to modules)
- `user_id` (uuid, FK to auth.users)
- `question_text` (text, max 500 chars)
- `is_answered` (boolean, default false)
- `answer_text` (text, nullable — admin/teacher answer)
- `answered_by` (uuid, nullable)
- `answered_at` (timestamptz, nullable)
- `upvote_count` (integer, default 0)
- `is_pinned` (boolean, default false)
- `is_hidden` (boolean, default false)
- `created_at` (timestamptz)

New table: `chapter_question_upvotes`
- `id` (uuid, PK)
- `question_id` (uuid, FK to chapter_questions)
- `user_id` (uuid, FK to auth.users)
- unique constraint on (question_id, user_id)

RLS: Students can read all non-hidden questions for their chapters, insert their own, and upvote. Admins/teachers can answer, pin, and hide.

### Core Features

1. **Ask a Question** — Simple text input at the top of the Q&A section. Students type a short question (max 500 chars). Profanity filter applied before submission.

2. **Most Frequently Asked** — Questions sorted by `upvote_count` descending. The top question gets a "Most Asked" badge. Students can upvote (like "I have this question too") instead of duplicating.

3. **Answer Flow** — Admins/teachers see unanswered questions and can provide an official answer. Answered questions show the answer inline with the responder's name.

4. **Dashboard Widget** — A small "Trending Questions" card showing the top 2-3 unanswered questions across the student's active module, with a link to the relevant chapter.

### Files to Create/Modify

| Action | File |
|--------|------|
| Create | `supabase/migrations/..._chapter_questions.sql` |
| Create | `src/hooks/useChapterQuestions.ts` |
| Create | `src/components/questions/ChapterQASection.tsx` |
| Create | `src/components/questions/QuestionCard.tsx` |
| Create | `src/components/questions/AskQuestionInput.tsx` |
| Create | `src/components/dashboard/TrendingQuestionsCard.tsx` |
| Edit | `src/pages/ChapterPage.tsx` — Add Q&A section at bottom of content area |
| Edit | `src/components/dashboard/LearningHubOverview.tsx` — Add trending questions card |

### UI Behavior

- **Chapter Page**: Collapsible "Questions & Answers" card below the active section content. Shows question count badge. Expands to reveal the ask input + sorted question list.
- **Question Card**: Shows question text, upvote button with count, "Most Asked" badge for #1, answer (if answered), timestamp.
- **Dashboard**: Compact card with 2-3 top unanswered questions, each linking to the chapter.


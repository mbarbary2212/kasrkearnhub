

# Three-Step Plan: Revert Shuffling, Fix Display Size, AI Confidence Backfill

These are three independent changes, implemented as separate steps so each can be reverted individually.

---

## Step 1: Remove All Answer Randomization

Remove the shuffle logic entirely from both files. Choices render in their original database order (A, B, C, D, E).

### Files to modify

**`src/components/question-session/McqAnswerArea.tsx`** (lines 26-35)
- Delete the `shuffledChoices` useMemo block
- Replace `shuffledChoices` with plain `choices` in the render

**`src/components/exam/MockExamQuestion.tsx`** (lines 33-42)
- Delete the `shuffledChoices` useMemo block
- Replace `shuffledChoices` with plain `choices` in the render

No database changes. No admin toggle. Just remove shuffling completely.

---

## Step 2: Fit One Question Per Screen (Tablet, PC, Mobile)

Adjust spacing and sizing so a typical question with 5 choices and the Submit button fits on one screen without scrolling.

### Files to modify

**`src/components/question-session/QuestionSessionShell.tsx`**
- Reduce outer padding from `p-4 md:p-6` to `p-3 md:p-4`
- Add `max-w-5xl mx-auto` wrapper for desktop so layout doesn't stretch too wide on large monitors
- Constrain height to viewport: `h-[calc(100vh-4rem)]` (tighter than current `8rem`)

**`src/components/question-session/McqAnswerArea.tsx`**
- Reduce choice button padding from `p-3` to `p-2.5`
- Reduce spacing between choices from `space-y-2` to `space-y-1.5`
- Use `text-sm` consistently for choice text
- Reduce stem text from `text-base md:text-lg` to `text-sm md:text-base`

**`src/components/question-session/RightInsightPanel.tsx`**
- Reduce card spacing from `space-y-4` to `space-y-3`
- Reduce padding from `p-4 md:p-5` to `p-3 md:p-4`

**Mobile responsive** (in QuestionSessionShell):
- On `< md`: single column, right panel stacks below
- Compact choice sizing for small screens

---

## Step 3: AI Confidence Backfill via Edge Function

Create an edge function that uses AI to rate existing MCQs against linked PDF source material.

### New file: `supabase/functions/backfill-ai-confidence/index.ts`
- Accepts `chapter_id` parameter
- Fetches MCQs where `ai_confidence IS NULL` for that chapter
- Finds linked PDF via `admin_documents` table for the chapter
- Downloads PDF from Supabase storage
- Sends batches of MCQs (10 at a time) to AI with the PDF content
- AI rates each MCQ 0-10 for accuracy against the source
- Updates `mcqs.ai_confidence` for each question

### Modified file: `src/components/content/McqList.tsx`
- Add an admin-only "Rate AI Confidence" button in the toolbar
- Calls the edge function for the current chapter
- Shows progress via toast notifications


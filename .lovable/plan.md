

# SBA (Single Best Answer) Question Type — Implementation Plan

## Overview
Add SBA as a new question format sharing the existing `mcqs` table, distinguished by a `question_format` column. SBA appears as a **separate tab** in Practice alongside MCQs. The only differences are semantic labels ("best answer" vs "correct answer") and AI generation prompts.

---

## Phase 1 — Foundation

### 1. Database Migration
- Add column: `ALTER TABLE mcqs ADD COLUMN question_format TEXT NOT NULL DEFAULT 'mcq' CHECK (question_format IN ('mcq', 'sba'));`
- Existing rows auto-default to `'mcq'`. No RLS/index changes needed.

### 2. Types & Hooks (`src/hooks/useMcqs.ts`)
- Add `question_format: 'mcq' | 'sba'` to `Mcq` and `McqFormData` interfaces
- Update `mapDbRowToMcq` to include `question_format`
- Add optional `format` parameter to `useChapterMcqs`, `useChapterMcqCount`, `useModuleMcqs`, `useTopicMcqs` — applies `.eq('question_format', format)` filter
- Add thin wrapper hooks: `useChapterSbas`, `useChapterSbaCount`, `useTopicSbas`
- Ensure `useCreateMcq` / `useUpdateMcq` pass `question_format` through

### 3. Tab Config (`src/config/tabConfig.ts`)
- Add `'sba'` to `PracticeTabId` type
- Add `{ id: 'sba', label: 'SBA', icon: HelpCircle }` after MCQs in `PRACTICE_TABS`
- Add `sba` to `createPracticeTabs` counts

---

## Phase 2 — Core UI

### 4. McqList (`src/components/content/McqList.tsx`)
- Add `questionFormat?: 'mcq' | 'sba'` prop (default `'mcq'`)
- Change header: "SBA Questions" vs "MCQ Questions"
- Add amber hint banner for SBA: "All answer choices may be plausible — select the **BEST** answer"
- Pass `questionFormat` to McqCard, McqFormModal, bulk import, AI factory

### 5. McqCard (`src/components/content/McqCard.tsx`)
- Add `questionFormat` prop
- Show amber "SBA" badge (bg `#FFF3CD`, text `#92600A`, border `#F6C94E`) for SBA
- Change instruction: "Select the BEST answer" (with bold amber "BEST") for SBA

### 6. McqFormModal (`src/components/content/McqFormModal.tsx`)
- Add `questionFormat` prop
- Change label: "Best Answer (most correct among plausible choices)" for SBA
- Change modal title: "SBA Question" vs "MCQ Question"
- Pass `question_format` in create/update payload

### 7. ChapterPage + TopicDetailPage
- Add `useChapterSbas` / `useChapterSbaCount` queries (and topic equivalents)
- Pass `sba` count to `createPracticeTabs`
- Add `practiceTab === 'sba'` block rendering `<McqList questionFormat="sba" />`

---

## Phase 3 — Admin + Import

### 8. McqAdminTable (`src/components/content/McqAdminTable.tsx`)
- Add "Format" column showing MCQ (teal) or SBA (amber) badge
- Add format filter dropdown (All / MCQ / SBA)

### 9. Bulk Import Edge Function (`supabase/functions/bulk-import-mcqs`)
- Accept optional `questionFormat` field in request body (default `'mcq'`)
- Pass through to insert records as `question_format`

---

## Phase 4 — AI Generation

### 10. AI Content Factory
- **`AIContentFactoryModal.tsx`**: Add SBA entry to `CONTENT_TYPES` array with amber badge
- **`AIContentPreviewCard.tsx`**: Handle `'sba'` — render like MCQ but with "Best Answer:" label and amber badge
- **`generate-content-from-pdf` edge function**: Add SBA prompt variant instructing AI to make all distractors plausible, with one single best answer. Set `question_format: 'sba'` on generated items.

---

## Phase 5 — Exam + Analytics

### 11. Exam Runner
- **`ChapterMockExamSection.tsx`**: Add SBA as exam content type option
- **`MockTimedExam.tsx` / `MockExamQuestion.tsx`**: Show "Select the BEST answer" for `question_format === 'sba'`

### 12. Analytics
- **`QuestionAnalyticsTabs.tsx`**: Add SBA tab
- **`calculate-mcq-analytics` edge function**: Accept `format` filter param
- **`McqAnalyticsDashboard.tsx`**: Add format toggle (MCQ / SBA)

### 13. Progress Tracking
- No changes needed. SBA attempts use existing `'mcq'` question type in `question_attempts`. SBA-specific breakdowns can be derived by joining to `mcqs.question_format`.

---

## Files Modified (~20-25 files)

| Category | Files |
|----------|-------|
| Migration | 1 new SQL migration |
| Hooks | `useMcqs.ts` |
| Config | `tabConfig.ts` |
| Components | `McqList.tsx`, `McqCard.tsx`, `McqFormModal.tsx`, `McqAdminTable.tsx` |
| Pages | `ChapterPage.tsx`, `TopicDetailPage.tsx` |
| Edge Functions | `bulk-import-mcqs`, `generate-content-from-pdf` |
| AI Factory | `AIContentFactoryModal.tsx`, `AIContentPreviewCard.tsx` |
| Exams | `ChapterMockExamSection.tsx`, `MockTimedExam.tsx`, `MockExamQuestion.tsx` |
| Analytics | `QuestionAnalyticsTabs.tsx`, `McqAnalyticsDashboard.tsx` |

---

## Visual Design

- **MCQ**: existing teal/green (`#10B981`)
- **SBA**: amber/gold (`#F59E0B`, bg `#FFF8E7`, text `#92600A`, border `#F6C94E`)
- Amber badge, amber active tab accent, amber hint banner with Lightbulb icon


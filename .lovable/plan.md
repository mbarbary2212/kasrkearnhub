
# Student QuestionSession — Split-Screen Redesign (Final Approved)

## Overview
Replace the vertically-stacked card layout with a tablet-first 60/40 split-screen, one-question-per-screen experience for MCQ, SBA, and OSCE. Admin views unchanged.

## Layout

```text
┌──────────────────────────────────────────────────────────────┐
│  QuestionSessionShell (grid-cols-[3fr_2fr], full height)     │
│ ┌──────────────────────┐ ┌─────────────────────────────────┐ │
│ │   LEFT PANEL (60%)   │ │     RIGHT PANEL (40%)           │ │
│ │                      │ │                                 │ │
│ │  Q3 / 94             │ │  Pre-submit:                    │ │
│ │  Stem / Vignette     │ │   Empty placeholder message     │ │
│ │  Image (OSCE)        │ │                                 │ │
│ │  Choices A–E / T-F   │ │  Post-submit (5 cards):         │ │
│ │                      │ │                                 │ │
│ │  [Skip]   [Submit]   │ │   1. ExplanationCard            │ │
│ │                      │ │   2. ConfidenceCard             │ │
│ │  ← Prev    Next →    │ │   3. QuestionStatsCard          │ │
│ │  (3/94)              │ │   4. PerformanceStatsCard       │ │
│ └──────────────────────┘ │   5. ActionsCard                │ │
│                          └─────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## Left Panel — Post-Submission Answer Feedback
After submission, highlight the user's selected answer and clearly mark the correct answer directly in the choice list:
- Green border/bg on correct answer
- Red border/bg on user's wrong selection
- This provides immediate visual feedback without requiring the right panel

## Right Panel Cards (All Hidden Until Submission)

### 1. ExplanationCard (top, visually dominant)
- Green/red banner showing Correct/Incorrect
- Correct answer key and label
- Full explanation text from `mcq.explanation`
- If explanation contains per-option reasoning, render structured sections
- For OSCE: per-statement correctness + overall score (not A–E distribution)

### 2. ConfidenceCard
- Three pill buttons: Low / Medium / High (using shadcn ToggleGroup)
- Stored in `localStorage` keyed by question ID for v1
- Shown after submission, persists if pre-selected

### 3. QuestionStatsCard

**Section A — Donut Comparison (side-by-side)**

| "You" donut | "Students" donut |
|---|---|
| Single state: Correct / Wrong / Skipped | Proportional: Correct vs Wrong |

Key distinctions:
- **User "Skipped"** = explicit skip action by current user. Shown in user donut only.
- **Cohort donut** = shows Correct vs Wrong proportions only. Do NOT derive "skipped" from distractor data — only include if reliable data exists.
- Each donut has centered text label (e.g. "You: Incorrect") and small legend underneath
- Colors: green (correct), red (wrong), gray (skipped)

**Section B — Option Distribution (below donuts, MCQ/SBA only)**
- Simple horizontal bars for A–E with percentage labels
- Highlight: correct answer (green), user's answer (outline), most selected (bold)
- Source: `distractor_analysis` from `mcq_analytics`
- Fallback: "Response statistics not yet available"
- **OSCE**: Do NOT use A–E distribution. Use score-based feedback instead (average score, score distribution 0-5).

### 4. PerformanceStatsCard (text-based, no charts for v1)
Simple label/value pairs with percentages + counts:
- **This question**: Correct ✓ / Wrong ✗ / Skipped
- **Your chapter accuracy**: 68% (34/50)
- **Your module accuracy**: derived from existing data
- **Cohort chapter average**: from `useChapterAnalyticsSummary(chapterId)` → `avgFacility`
- **Cohort module average**: from `useModuleAnalyticsSummary(moduleId)` → `avgFacility`
- Keep layout minimal

### 5. ActionsCard
- "Repeat Question" button — resets local UI state (selectedKey, isSubmitted)
- On repeat + re-submit: saves as a **new attempt** (increment `attempt_number`) rather than overwriting

## Skip Behavior
- Left panel shows both **[Skip]** and **[Submit]** buttons
- **User skip** = explicit action, advances to next question without answering
- Track skipped questions in session state: `skippedQuestions: Set<string>`
- **Cohort unanswered** = derived from total enrolled minus attempted — this is a different concept, NOT treated the same as user skip
- If user returns to a skipped question, they can still answer normally
- QuestionStatsCard reflects "You skipped this question" in the user donut (gray)

## Components to Create

| Component | File |
|-----------|------|
| `QuestionSessionShell` | `src/components/question-session/QuestionSessionShell.tsx` |
| `RightInsightPanel` | `src/components/question-session/RightInsightPanel.tsx` |
| `ExplanationCard` | `src/components/question-session/ExplanationCard.tsx` |
| `ConfidenceCard` | `src/components/question-session/ConfidenceCard.tsx` |
| `QuestionStatsCard` | `src/components/question-session/QuestionStatsCard.tsx` |
| `PerformanceStatsCard` | `src/components/question-session/PerformanceStatsCard.tsx` |
| `ActionsCard` | `src/components/question-session/ActionsCard.tsx` |
| `McqAnswerArea` | `src/components/question-session/McqAnswerArea.tsx` |
| `OsceAnswerArea` | `src/components/question-session/OsceAnswerArea.tsx` |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/content/McqList.tsx` | When `!isAdmin`, render `QuestionSessionShell` instead of card list |
| `src/components/content/OsceList.tsx` | When `!isAdmin`, render `QuestionSessionShell` instead of card list |

## Data Sources (All Existing — No New Tables)

| Data | Source |
|------|--------|
| Questions | `mcqs[]` / `osceQuestions[]` already fetched |
| Previous attempts | `useAllChapterQuestionAttempts` → `attemptMap` |
| Per-question analytics | `useMcqAnalyticsById(mcqId)` → `distractor_analysis`, `facility_index`, `total_attempts` |
| Chapter cohort stats | `useChapterAnalyticsSummary(chapterId)` → `avgFacility` |
| Module cohort stats | `useModuleAnalyticsSummary(moduleId)` → `avgFacility` |
| Save attempt | `useSaveQuestionAttempt` (RPC `save_question_attempt`) |
| Confidence | `localStorage` keyed `confidence_${questionId}` |

## Core Rules
1. Explanation and statistics hidden before submission — no peer data before answering
2. Tablet-first split layout (10" landscape primary target)
3. One-question-per-screen
4. Shared architecture across MCQ, SBA, OSCE
5. Left panel shows answer feedback (green/red) after submission
6. Both panels scroll independently — no whole-page scroll
7. Responsive: `grid-cols-1 md:grid-cols-[3fr_2fr]`; mobile stacks vertically

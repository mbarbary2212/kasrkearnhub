

## Plan: Fix Transcript Modal for Structured Cases + Show Section Answers

### Problem
The transcript modal (`AICaseTranscriptModal`) only queries `ai_case_messages` — which is used by AI-driven chat cases. Structured cases (like the Wounds case) store student answers in `case_section_answers`. That's why the modal shows "No messages found for this attempt."

### Solution
Update the transcript modal to also fetch `case_section_answers` when no chat messages exist (or always for structured cases). Display each section answer with its score, AI feedback, strengths, and gaps — reusing the same rendering logic from `CaseSummary.tsx`.

### Changes

**`src/hooks/useAICaseAdmin.ts`**
- Add a new hook `useAICaseSectionAnswers(attemptId)` that queries `case_section_answers` for a given attempt, returning section_type, student_answer, score, max_score, ai_feedback, is_scored.

**`src/components/admin/AICaseTranscriptModal.tsx`**
- Import and call `useAICaseSectionAnswers` alongside `useAICaseTranscript`.
- When `messages` is empty but `sectionAnswers` has data, render a structured case view instead:
  - Each section as a collapsible card showing:
    - Section label (from `SECTION_LABELS`)
    - Score badge (score/max_score)
    - Student answer (rendered as text or JSON summary)
    - AI feedback with strengths/gaps (parsed same as `CaseSummary`)
- When both are empty, show "No data found."
- Update the stats row: hide "Turns" for structured cases (message_count = 0), show section count instead.

### UI in the Modal (Structured Case)

```text
┌──────────────────────────────────┐
│ mohamed  42%  Flagged?           │
│ Post-operative Wound Dehiscence  │
├──────────────────────────────────┤
│ ⏱ 5m 49s  📋 6 sections  $0.00 │
├──────────────────────────────────┤
│ ▼ History Taking       8/10     │
│   Student: "Patient presents..." │
│   ✓ Good differential, ...       │
│   ✗ Missed family history        │
│                                  │
│ ▼ Physical Examination  6/10    │
│   Student: "On examination..."   │
│   ...                            │
│                                  │
│ ▼ Conclusion            3/5     │
│   ...                            │
└──────────────────────────────────┘
```

### Files

| File | Change |
|------|--------|
| `useAICaseAdmin.ts` | Add `useAICaseSectionAnswers` hook |
| `AICaseTranscriptModal.tsx` | Render section answers for structured cases |


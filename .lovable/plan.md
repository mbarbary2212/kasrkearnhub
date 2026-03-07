

## Plan: Two-Phase History Taking with AI Patient Chat + Voice

### Overview

Redesign the History Taking section into a **two-phase flow**:
- **Phase 1**: Student interacts with the patient (text chat, voice, or reads handover)
- **Phase 2**: Comprehension questions appear after student clicks "Finished"

Add a new edge function for AI patient conversation, with **voice mode in Egyptian Arabic** and **chat mode in English**.

### Language Rules
- **Chat mode**: English (student types English questions, AI responds in English)
- **Voice mode**: Egyptian Arabic (العامية المصرية) — student speaks Arabic, AI responds in Arabic. English medical terms allowed for medical professional characters only.
- **Text mode** (ATMIST handover): English, read-only, no copy/paste

### Anti-Cheat
- Existing `select-none`, `onCopy/onPaste/onCut preventDefault` on the runner Card stay
- Add `onContextMenu preventDefault` to block right-click
- Add a semi-transparent watermark overlay with student name to deter screenshot sharing

### Changes

**1. New Edge Function: `supabase/functions/patient-history-chat/index.ts`**
- Accepts `{ case_id, messages, mode }` — `mode` is `'chat'` or `'voice'`
- Loads case data (`generated_case_data.history_taking`) using service role client
- Builds system prompt:
  - For **chat mode**: English persona, patient reveals info from ATMIST/checklist when asked relevant questions
  - For **voice mode**: Egyptian Arabic persona, same reveal logic
- Uses existing `callAIWithMessages` from `_shared/ai-provider.ts`
- Returns `{ reply: string }`

**2. Update: `supabase/config.toml`**
- Add `[functions.patient-history-chat]` with `verify_jwt = false`

**3. Rewrite: `src/components/clinical-cases/sections/HistoryTakingSection.tsx`**

State machine with phases:

```text
Phase 'interact':
  If historyInteractionMode includes voice/chat options:
    Landing screen → large centered avatar + "Chat" / "Voice" buttons
  
  Text mode (no chat/voice):
    Show ATMIST handover (select-none), "Finished Reading" button
  
  Chat mode:
    Chat bubble UI, text input, student asks questions in English
    AI patient responds in English
    "End Conversation" → phase='questions'
  
  Voice mode:
    Centered avatar with pulse, mic button (SpeechRecognition ar-EG)
    AI response via SpeechSynthesis ar-EG
    "End Conversation" → phase='questions'

Phase 'questions':
  History/chat disappears
  Comprehension questions appear
  Student answers and submits (answers + conversation transcript)
```

**4. Update: `src/components/clinical-cases/StructuredCaseRunner.tsx`**
- Add `onContextMenu={e => e.preventDefault()}` to the runner Card
- Pass student name (from auth user) as prop for watermark

**5. Update: `supabase/functions/score-case-answers/index.ts`**
- For `history_taking`, if `student_answer` includes a `conversation_transcript`, score how many checklist items the student successfully elicited in addition to comprehension answers

### Files Summary

| File | Change |
|------|--------|
| `supabase/functions/patient-history-chat/index.ts` | New — AI patient conversation endpoint |
| `supabase/config.toml` | Add function entry |
| `src/components/clinical-cases/sections/HistoryTakingSection.tsx` | Full rewrite — two-phase flow with chat/voice/text modes |
| `src/components/clinical-cases/StructuredCaseRunner.tsx` | Add context menu block, pass student name |
| `supabase/functions/score-case-answers/index.ts` | Update history scoring for conversation transcripts |


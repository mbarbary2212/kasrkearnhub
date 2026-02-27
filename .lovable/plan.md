

## Revised Plan: Security Hardening + Case Creation Guide

The previous plan was built for an obsolete stage-based system. This plan reflects the current AI-driven OSCE architecture.

---

### What the old plan got wrong

The codebase no longer uses pre-authored stages, consequence_text, state_delta_json, or feedback_timing in the runner. All cases run through a single AI examiner (`run-ai-case` edge function). The `case_type` column exists in the DB but is never read by application logic. The old plan's 8 sections were solving problems that do not exist.

---

### New Plan (2 priorities)

---

### Priority 1: Server-Side Security Hardening

**Problem**: Student messages go directly to the AI with zero server-side validation. The `_shared/security.ts` file has `detectPromptInjection()` but it is **not imported or used** in `run-ai-case`.

#### 1a. Add `detectProfanity()` to `supabase/functions/_shared/security.ts`

- New function with regex blocklist (English profanity + common Arabic transliterated slurs)
- Same pattern as existing `detectPromptInjection()`

#### 1b. Add input validation in `supabase/functions/run-ai-case/index.ts`

Before saving the user message (currently line 337), add:

1. **Length limit**: Reject `userMessage` > 2000 characters with 400 error
2. **Prompt injection check**: Call `detectPromptInjection(userMessage)` — if true, skip AI call entirely, return a debrief JSON with `score: 0`, `flag_for_review: true`, message: "Session terminated due to policy violation"
3. **Profanity check**: Call `detectProfanity(userMessage)` — if true, return a redirect response warning the student to use professional language (do not save or forward the message)

#### 1c. Add output validation after AI response parsing

After `parseAIResponse()`, scan the `prompt` and `teaching_point` fields through `detectPromptInjection()`. If injection detected in AI output, replace with a safe fallback redirect.

#### 1d. Add language/conduct rule to system prompt

Add guardrail rule #7:
> "LANGUAGE & CONDUCT: If the student uses profanity, slurs, or abusive language, respond with a redirect reminding them to maintain professional clinical language. Do not engage with inappropriate content."

#### 1e. Add client-side length limit in `src/hooks/useAICase.ts`

Reject messages over 2000 characters with a toast before sending.

---

### Priority 2: Admin Case Creation Guide

#### 2a. Add collapsible guide in `src/components/clinical-cases/ClinicalCaseFormModal.tsx`

A `<Collapsible>` section at the top of the form with:

**Required fields:**
- **Title** — Short, descriptive (e.g., "Acute Chest Pain in a 55-year-old Male")
- **Intro Text** — 2-4 sentences: patient demographics, chief complaint, setting. This is the scenario the AI examiner uses.
- **Module** — Which module this case belongs to
- **Difficulty** — Beginner / Intermediate / Advanced
- **Estimated Minutes** — 5-10 beginner, 10-15 intermediate, 15-20 advanced
- **Examiner Avatar** — Dr. Sarah, Dr. Laylah, Dr. Omar, Dr. Hani

**Recommended fields:**
- **Learning Objectives** — Comma-separated skills the student should demonstrate. The AI uses these to structure questions and grade the debrief.
- **Tags** — For filtering (e.g., "cardiology", "emergency")
- **Max Turns** — Default 10. Fewer = focused, more = comprehensive.
- **Patient Details** — Name, age, gender for immersion.

---

### Files to Change

| File | Change |
|------|--------|
| `supabase/functions/_shared/security.ts` | Add `detectProfanity()` |
| `supabase/functions/run-ai-case/index.ts` | Import security utils, add input validation (length + injection + profanity), output validation, new system prompt rule |
| `src/hooks/useAICase.ts` | 2000-char client-side limit with toast |
| `src/components/clinical-cases/ClinicalCaseFormModal.tsx` | Collapsible case creation guide |
| `.lovable/plan.md` | Replace with this plan |

### What stays unchanged
- AI examiner behavior (Learning Mode / Exam Mode)
- Cohort Intelligence system
- Streaming responses
- Session recovery
- Examiner avatars




## Revised Plan: Security Hardening + Case Creation Guide

### Status: ✅ Implemented

---

### What was implemented

#### Priority 1: Server-Side Security Hardening

1. **`detectProfanity()` added to `supabase/functions/_shared/security.ts`**
   - Regex blocklist covering English profanity, Arabic transliterated slurs, threats, and sexual harassment
   - Same pattern as existing `detectPromptInjection()`

2. **Input validation in `supabase/functions/run-ai-case/index.ts`**
   - 2000-character length limit on `userMessage` (400 error)
   - Prompt injection check via `detectPromptInjection()` — returns immediate debrief with `score: 0`, `flag_for_review: true`
   - Profanity check via `detectProfanity()` — returns redirect warning to use professional language
   - Both checks skip `BEGIN_CASE` messages

3. **Output validation after AI response parsing**
   - Both streaming and non-streaming paths scan `prompt` and `teaching_point` through `detectPromptInjection()`
   - Injection in output → replaced with safe redirect fallback

4. **System prompt Rule #7: LANGUAGE & CONDUCT**
   - Instructs AI examiner to redirect if student uses profanity/abuse

5. **Client-side length limit in `src/hooks/useAICase.ts`**
   - Messages over 2000 characters rejected with toast before sending

#### Priority 2: Admin Case Creation Guide

6. **Collapsible guide in `src/components/clinical-cases/ClinicalCaseFormModal.tsx`**
   - "How to create a good case" section listing required and recommended fields
   - Guidance on writing effective scenarios and learning objectives

---

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/_shared/security.ts` | Added `detectProfanity()` |
| `supabase/functions/run-ai-case/index.ts` | Input validation, output validation, system prompt rule #7 |
| `src/hooks/useAICase.ts` | 2000-char client-side limit |
| `src/components/clinical-cases/ClinicalCaseFormModal.tsx` | Collapsible case creation guide |

### What stays unchanged
- AI examiner behavior (Learning Mode / Exam Mode)
- Cohort Intelligence system
- Streaming responses
- Session recovery
- Examiner avatars

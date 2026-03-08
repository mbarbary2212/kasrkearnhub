

## Problem: AI Patient Says Wrong Name

The patient name in the database is **"Amr Khalil"** — there's no "Omar" stored anywhere. The AI model is likely conflating "Amr" with "Omar" since they're phonetically similar in Arabic (عمر vs عمرو).

**Two fixes:**

### Fix 1 — Make patient name editable in CasePreviewEditor

The `generated_case_data.patient` object (name, age, gender, occupation, background) is currently **not editable** in the editor. Add a "Patient Info" card at the top of the History Taking editor section so Mohamed can correct the name directly.

**File:** `src/components/clinical-cases/CasePreviewEditor.tsx`
- Add editable fields for `patient.name`, `patient.age`, `patient.gender`, `patient.occupation`, `patient.background` at the top of the case editor (above sections)
- When saved, update `generated_case_data.patient` in the database

### Fix 2 — Strengthen the system prompt

The current prompt says `You are role-playing as ${name}` but the AI may still deviate. Add an explicit rule:

**File:** `supabase/functions/patient-history-chat/index.ts`
- Add to both English and Arabic system prompts: "Your name is exactly ${name}. If asked your name, always say ${name}. Do not use any other name."
- Arabic version: "اسمك بالظبط ${name}. لو حد سألك عن اسمك قول ${name}. ما تستخدمش أي اسم تاني."

### Files

| File | Change |
|------|--------|
| `supabase/functions/patient-history-chat/index.ts` | Add explicit name rule to both prompts |
| `src/components/clinical-cases/CasePreviewEditor.tsx` | Add Patient Info editor (name, age, gender, occupation, background) |


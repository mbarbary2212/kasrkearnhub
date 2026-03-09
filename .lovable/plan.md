

# Root Cause Analysis & Fixes for Ahmed's Reported Issues

## Issue 1: Temperature in Fahrenheit instead of Celsius

**Root Cause**: The case generation prompt (line 343 of `generate-structured-case/index.ts`) specifies vitals as `{ "name": "HR|BP|Temp|RR|SpO2|CRT", "value": "string", "unit": "string" }` but does NOT enforce Celsius. The global `enrichSystemPrompt` appends lab unit rules (mg/dL, g/dL, etc.) but says nothing about vital sign units. The AI model defaults to Fahrenheit for some patients.

**Fix**: Add a vital signs unit rule to the `LAB_UNITS_RULE` constant in `supabase/functions/_shared/ai-provider.ts` AND add explicit unit guidance in the generation schema (line 343 of `generate-structured-case`).

## Issue 2: Wrong Patient Name

**Root Cause**: The patient chat system prompt correctly injects `patient.name` (lines 191, 217). However, the `patient` object comes from `generatedData.patient` (line 71), which may be `undefined` for older cases where patient data is nested inside `history_taking` instead. When `patient` is empty, the name falls back to `'the patient'` or `'المريض'`, and the AI hallucinates a name from the ATMIST handover text or reference documents.

**Fix**: Add a fallback chain in `patient-history-chat/index.ts` that also checks `generatedData.history_taking.patient_profile` (the newer generation schema nests it there) and `generatedData.case_meta` for the patient name.

## Issue 3: Marked Down for Diabetes Despite Stating It

**Root Cause**: The scoring prompt in `score-case-answers/prompts.ts` (lines 22-33) sends the conversation transcript + checklist to the AI scorer and asks it to identify "which important items were missed." The prompt does NOT distinguish between a student *asking* about a condition vs. *stating* it. If the student said "the patient is diabetic" (declaratively) rather than asking the patient "do you have diabetes?", the AI scorer may classify this as not properly eliciting the history item.

**Fix**: Update the scoring prompt to explicitly instruct: "If the student states or acknowledges a condition (e.g., 'the patient is diabetic'), this counts as covering that checklist item. Only mark items as missed if the student neither asked about nor mentioned them."

## Issue 4: Conclusion/Summary Too Long to Fill

**Root Cause**: The `ConclusionSection.tsx` uses a `Textarea` with `rows={8}` for ward round presentations and `rows={5}` for others. The issue is that the **generated task instructions** (from `generate-structured-case`) can be overly verbose, and the ward round presentation rubric often expects an extremely detailed structure (`expected_structure` array). Students feel the expected answer is unreasonably long.

**Fix**: Two changes:
1. In `generate-structured-case/index.ts`, add a constraint to the conclusion schema: "Keep ward round presentation instructions concise (3-5 bullet points max). The student should write a brief structured summary, not a full report."
2. In `ConclusionSection.tsx`, show a word count hint and auto-expand the textarea.

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/_shared/ai-provider.ts` | Add vital signs unit rule (Celsius for Temp) to `LAB_UNITS_RULE` |
| `supabase/functions/patient-history-chat/index.ts` | Add fallback chain for patient name: check `history_taking.patient_profile`, `case_meta` |
| `supabase/functions/score-case-answers/prompts.ts` | Update history_taking scoring prompt to credit stated conditions, not just asked ones |
| `supabase/functions/generate-structured-case/index.ts` | Add "Temp in °C" to vital signs schema, add concise conclusion instruction |
| `src/components/clinical-cases/sections/ConclusionSection.tsx` | Add word count indicator and guidance text |

## Key Changes Detail

### ai-provider.ts — Add vital signs rule
Append to `LAB_UNITS_RULE`:
```
- Temperature → °C (Celsius). NEVER use Fahrenheit.
- Blood Pressure → mmHg
- Heart Rate → bpm
- Respiratory Rate → breaths/min
- SpO2 → %
```

### patient-history-chat — Name fallback
```typescript
const patientData = generatedData.patient 
  || generatedData.history_taking?.patient_profile 
  || generatedData.case_meta?.patient 
  || {};
```

### score-case-answers/prompts.ts — Fair scoring
Add to the history_taking transcript evaluation block:
```
IMPORTANT: If the student states or acknowledges a condition (e.g., "the patient is diabetic", "history of diabetes"), count that checklist item as covered. Only mark items as missed if the student neither asked about nor mentioned them during the conversation.
```

### generate-structured-case — Schema constraints
- Vital signs line: add `"unit": "°C for Temp, mmHg for BP, bpm for HR, breaths/min for RR, % for SpO2"`
- Conclusion section: add `"Keep instructions concise. Ward round presentation should be a brief structured summary (5-8 sentences max), not a full case report."`

### ConclusionSection.tsx — UX improvement
Add a small word/character count below each textarea and a helper text like "Aim for 100-200 words" for ward round, "Aim for 50-100 words" for others.


# Updated Plan: Sticky Controls + Pre-Case Briefing (with expected answers)

## Change 1: Sticky header/footer in History Taking

**File:** `src/components/clinical-cases/sections/HistoryTakingSection.tsx`

No change from the approved plan — restructure chat/voice into flex column with:

- Non-scrolling top: patient avatar + timer
- Scrollable middle: messages
- Non-scrolling bottom: input + counter + End Conversation
- Container: `h-[calc(100vh-280px)] min-h-[400px]`

## Change 2: Pre-case briefing dialog (updated content)

**File:** `src/pages/VirtualPatientPage.tsx`

AlertDialog appears when "Start Interactive Case" is clicked. Two buttons at bottom:

- **Cancel** — closes dialog, stays on intro screen
- **Begin Case** — closes dialog, starts the attempt

Updated dialog content tells students **what they need to answer/fill** in each section:

> **Before You Begin**
>
> This case has several sections. After each section you will submit your answers before moving on.
>
> **History Taking** — Interview the virtual patient. You are expected to gather a focused data to answer questions. 
>
> **Physical Examination** — Select body regions on a body map. After revealing findings, write a brief summary of the key abnormalities you identified.
>
> **Investigations — Labs** — Select which laboratory tests you would order. Review the results provided.
>
> **Investigations — Imaging** — Select which imaging studies you would request. Review and interpret the results.
>
> **Diagnosis** — Write your possible diagnosis, list differential diagnoses, and state your final diagnosis with justification.
>
> **Management** — Answer multiple-choice and free-text questions about your treatment plan (medical and/or surgical).
>
> **Monitoring & Follow-up** — Describe your monitoring plan and follow-up strategy.
>
> **Patient & Family Advice** — Write the advice you would give the patient and their family.
>
> **Conclusion** — Complete final tasks such as a ward round presentation or key learning reflections.
>
> You can review completed sections but cannot change your answers.

Note: Only sections active for the specific case will appear — the dialog lists all possible ones so the student knows what to expect regardless of combination.

## Files


| File                                                              | Change                                                           |
| ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| `src/components/clinical-cases/sections/HistoryTakingSection.tsx` | Flex column with sticky header/footer                            |
| `src/pages/VirtualPatientPage.tsx`                                | AlertDialog with section-by-section expected-answer instructions |

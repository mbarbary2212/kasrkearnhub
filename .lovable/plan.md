

## Plan: All Pending Improvements (Body Map, Pass Support, Scoring Fixes, Checklist Hide)

This plan consolidates all approved changes into one implementation pass.

### 1. Create SVG Body Map Component
**New file:** `src/components/clinical-cases/sections/BodyMap.tsx`

- Single anatomical SVG illustration (no adult/child distinction) styled similar to the reference image — a front-facing human body showing internal organs/systems
- Clickable hotspot regions with labels positioned around the body (like the reference: Neuro, HEENT, CV, Pulm, Vital Signs, etc.)
- Region keys from case data are fuzzy-mapped to SVG positions (e.g., keys containing "head"/"neuro" → head area, "cardio"/"cv" → chest area)
- Clicked regions highlight with a color change; unmatched regions shown as side badges
- Clicking a region reveals findings in a **side panel** (right side) rather than a popover

### 2. Rewrite Physical Exam Section
**Modified:** `PhysicalExamSection.tsx`

- Replace button grid with a two-column layout: SVG body map (left) + findings side panel (right)
- Side panel shows the selected region's label and finding text, updates on each click
- Add a `Textarea` below for "Summarize your key findings" (with "pass" placeholder)
- Submit sends `revealed_regions`, `findings_summary`, and counts
- Once revealed, regions cannot be un-revealed

### 3. Labs & Imaging — Side Panel Layout
**Modified:** `InvestigationsLabsSection.tsx`, `InvestigationsImagingSection.tsx`

- After ordering, show results in a side panel layout (selection list left, results right) instead of replacing the selection entirely

### 4. "Pass" Skip Support — All Text Inputs
**Modified:** All section components with `<Textarea>` fields

- Update placeholder text to: `"Type your answer... (type 'pass' to skip)"`
- No validation changes needed ("pass" already passes `.trim().length > 0`)

### 5. Hide History Checklist from Students
**Modified:** `HistoryTakingSection.tsx`

- Remove lines 70-90 (the "History Checklist Reference" block) — this is admin-only data

### 6. Scoring Prompt Fixes
**Modified:** `supabase/functions/score-case-answers/prompts.ts`

- **physical_examination:** Score the student's `findings_summary` against expected region findings
- **investigations_labs:** Add explicit penalty: "Deduct 1 point per non-key test ordered. Score cannot go below 0."
- **investigations_imaging:** Same penalty: "Deduct 1 point per non-key imaging study ordered."
- **All sections:** Add instruction: "If student answered 'pass', give 0 points with justification 'Student chose to skip.'"

### Files Summary

| File | Action |
|------|--------|
| `src/components/clinical-cases/sections/BodyMap.tsx` | **Create** |
| `src/components/clinical-cases/sections/PhysicalExamSection.tsx` | **Rewrite** |
| `src/components/clinical-cases/sections/InvestigationsLabsSection.tsx` | **Modify** — side panel |
| `src/components/clinical-cases/sections/InvestigationsImagingSection.tsx` | **Modify** — side panel |
| `src/components/clinical-cases/sections/HistoryTakingSection.tsx` | **Modify** — remove checklist, add pass hint |
| `src/components/clinical-cases/sections/DiagnosisSection.tsx` | **Minor** — pass placeholder |
| `src/components/clinical-cases/sections/ManagementSection.tsx` | **Minor** — pass placeholder |
| `src/components/clinical-cases/sections/MonitoringSection.tsx` | **Minor** — pass placeholder |
| `src/components/clinical-cases/sections/AdviceSection.tsx` | **Minor** — pass placeholder |
| `src/components/clinical-cases/sections/ConclusionSection.tsx` | **Minor** — pass placeholder |
| `supabase/functions/score-case-answers/prompts.ts` | **Modify** — penalties + pass handling |




## Plan: Add patient intro card to History Taking mode selection screen

### Problem
The History Taking mode selection screen (Chat/Voice) only shows the avatar name and language. It's missing the patient's age, gender, and chief complaint — key context the student needs before starting.

### Change

**File: `src/components/clinical-cases/sections/HistoryTakingSection.tsx`**

1. Add three new props to the component interface: `patientAge?: number`, `chiefComplaint?: string` (patientGender already exists)

2. Update the mode selection screen (around line 714-730) to show a compact patient info card below the avatar:
   - Display: name, age, gender, and chief complaint
   - Style: subtle card/badge layout consistent with the existing glassmorphism design

**File: `src/components/clinical-cases/StructuredCaseRunner.tsx`**

3. Pass the new props to HistoryTakingSection (around line 320-337):
   - `patientAge={(generatedData?.patient as any)?.age}`
   - `chiefComplaint={caseData.chief_complaint || caseData.intro_text}`

### Result
The mode selection screen will show something like:
```text
   [Avatar]
  Old male patient
  🌐 Arabic
  Age: 65 · Male
  CC: Chest pain for 2 hours
  Choose how you want to take the history
  [Chat]  [Voice]
```

Two files, minimal changes.




## Plan: Three changes to VirtualPatientPage + max turns default

### Change 1: 2-attempts-per-day cap

**File: `src/pages/VirtualPatientPage.tsx`**

Add computed values after line 166 (`completedAttempts`):

```typescript
const todayStart = new Date();
todayStart.setHours(0, 0, 0, 0);
const attemptsToday = (pastAttempts ?? []).filter(a =>
  new Date(a.started_at) >= todayStart
).length;
const canStartToday = attemptsToday < 2;
```

**Outer "Start Interactive Case" button (line 219-227):**
- Add `disabled={!canStartToday || startAttempt.isPending}`
- When `!canStartToday`, show an amber badge `2/2 today` next to the button

**Briefing dialog "Begin Case" button (line 288-304):**
- Add `!canStartToday` to disabled condition
- When `!canStartToday`, show text "Daily limit reached (2/2)" instead of "Begin Case"
- Below the footer, when `!canStartToday`, add centered muted text: "You've used both attempts for today. Come back tomorrow to try again."

### Change 2: Patient intro card in briefing dialog

**File: `src/pages/VirtualPatientPage.tsx`**

At the top of the dialog description content (before the existing "This case has several sections..." paragraph at line 239), add a compact card reading from `(vpCase as any).generated_case_data`:

```typescript
const caseData = (vpCase as any)?.generated_case_data;
```

Card shows (each row only if value exists):
- **Patient**: `caseData?.patient_name || caseData?.name`
- **Age / Gender**: `caseData?.age`, `caseData?.gender`
- **Presenting complaint**: `caseData?.chief_complaint || caseData?.presenting_complaint`

Styled as `rounded-lg border bg-muted/50 p-3 text-sm`, compact 4-line max.

### Change 3: Change default max turns from 10 to 5

The `max_turns` value is not a constant in HistoryTakingSection. It lives in two client-side locations:

**File: `src/hooks/useStructuredCase.ts` (line 31)**
- Change `max_turns: 10` to `max_turns: 5` (default for newly created cases)

**File: `src/components/clinical-cases/ClinicalCaseCard.tsx` (line 115)**
- Change `clinicalCase.max_turns || 10` to `clinicalCase.max_turns || 5` (display fallback)

### Files modified
- `src/pages/VirtualPatientPage.tsx` — Changes 1 + 2
- `src/hooks/useStructuredCase.ts` — Change 3 (default value)
- `src/components/clinical-cases/ClinicalCaseCard.tsx` — Change 3 (display fallback)

### Files NOT modified
- Edge functions, mutation logic, HistoryTakingSection, Scribe/TTS/chat logic


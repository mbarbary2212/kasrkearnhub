

## Plan: Simplify Case Types to Basic/Advanced with Full Behavioral Enforcement

### Summary

Replace the four `case_type` values (`guided`, `management`, `simulation`, `virtual_patient`) with two (`basic`, `advanced`). Preserve `feedback_timing` as an override. Ensure `advanced` mode properly shows consequences (with fallback), applies state deltas, and update templates + bulk importer to support new columns.

---

### 1. Database Migration

Migrate existing data and set new default:

```sql
UPDATE virtual_patient_cases SET case_type = 'basic' WHERE case_type IN ('guided', 'management');
UPDATE virtual_patient_cases SET case_type = 'advanced' WHERE case_type IN ('simulation', 'virtual_patient');
ALTER TABLE virtual_patient_cases ALTER COLUMN case_type SET DEFAULT 'basic';
```

No enum constraint exists (column is `text`), so no ALTER TYPE needed.

---

### 2. TypeScript Types

**`src/types/clinicalCase.ts`**:
- `CaseType` → `'basic' | 'advanced'`
- `CASE_TYPE_LABELS` → `{ basic: 'Basic', advanced: 'Advanced' }`
- `shouldShowImmediateFeedback(caseType, feedbackTiming)`:
  - If `feedbackTiming` is explicitly set, respect it (immediate → true, deferred → false)
  - Otherwise: `basic` → immediate, `advanced` → deferred

**`src/types/virtualPatient.ts`**:
- `VPCaseType` → `'basic' | 'advanced'`
- `shouldShowImmediateFeedbackVP(caseType, feedbackTiming)`: same logic as above
- Keep `VPFeedbackTiming` type (still stored in DB, used as override)

---

### 3. Runner Logic (`src/pages/VirtualPatientPage.tsx`)

**Feedback timing** (line ~167):
- Update default from `'guided'` to `'basic'`
- `shouldShowImmediateFeedbackVP` now handles override correctly

**Advanced consequence behavior** (line ~205):
- Current: only shows consequence if `consequence_text` exists AND `!showImmediate`
- New: for advanced (deferred), ALWAYS go to consequence state. If `consequence_text` is missing, show a neutral fallback: *"The clinical team notes your decision. The case continues..."*
- Apply `state_delta_json` (already done, no change needed)

**Patient Status Panel** (line ~409):
- Update comment from "simulation/virtual_patient" to "advanced"
- No logic change needed (already gated on `status_panel_enabled`)

**Summary/Debrief** (line ~807):
- Already shows stage-by-stage correctness review — this serves as the end-of-case debrief for advanced mode. No change needed.

---

### 4. Help Templates (`src/components/admin/HelpTemplatesTab.tsx`)

**Clinical Cases TXT template** (line ~407-475):
- Add new header fields: `# Case Type: basic` or `# Case Type: advanced`
- Add optional case-level: `# Initial State: {"time_elapsed_minutes":0,"hemodynamics":{"heart_rate":80},"risk_flags":[]}`
- Add stage-level optional fields to template comments and examples:
  - `CONSEQUENCE_TEXT:` — narrative consequence shown after decision
  - `STATE_DELTA:` — JSON string for patient state changes

Example addition to template:
```text
# Case Type: basic (or advanced)
# Initial State: {"time_elapsed_minutes":0,"hemodynamics":{"heart_rate":80,"systolic_bp":120,"diastolic_bp":80,"spo2":98},"risk_flags":[]}

STAGE 1:
TYPE: mcq
...
CONSEQUENCE_TEXT: The patient's condition stabilizes after your intervention.
STATE_DELTA: {"time_elapsed_minutes":15,"hemodynamics":{"heart_rate":72}}
```

- Update comment block to explain basic vs advanced behavior

---

### 5. Bulk Upload Parser (`src/components/clinical-cases/ClinicalCaseBulkUploadModal.tsx`)

**Case-level parsing** (in `parseSingleCase`, line ~164):
- Parse `# Case Type:` header → map to `basic` | `advanced` (also accept old values for backward compat: guided/management → basic, simulation/virtual_patient → advanced)
- Parse `# Initial State:` header → JSON parse into `initial_state_json`
- Pass `case_type` and `initial_state_json` to `createCase.mutateAsync()`

**Stage-level parsing** (in `parseStageBlock`, line ~88):
- Parse `CONSEQUENCE_TEXT:` line → store as `consequence_text`
- Parse `STATE_DELTA:` line → JSON parse into `state_delta_json`
- Pass both to `createStage.mutateAsync()`

**Unknown columns**: already safely ignored (parser only reads known `KEY:` prefixes)

**ParsedStage interface** (line ~29): add `consequence_text` and `state_delta_json` fields

**ParsedCase interface** (line ~41): add `case_type` and `initial_state_json` fields

---

### 6. Quick Build Parser (`src/components/clinical-cases/ClinicalCaseQuickBuildModal.tsx`)

- Add `CONSEQUENCE_TEXT:` and `STATE_DELTA:` to the regex lookahead lists (lines ~70-82)
- Parse both fields in the stage block
- Pass them through when creating stages

---

### 7. Stage Editor Help Text (`src/components/clinical-cases/CaseBuilderStageEditor.tsx`)

- Update any references from "simulation/virtual patient case types" to "advanced case types"

---

### 8. AI Content Generation

**`supabase/functions/generate-vp-case/index.ts`**:
- No references to old case_type values in generation logic — no changes needed
- The system prompt generates stages (not case metadata), so no update required

**`src/components/admin/AISettingsPanel.tsx`**:
- The `virtual_patient` value here refers to content type for AI generation, NOT case_type — no change needed

---

### Files to Edit

| File | Change |
|------|--------|
| Migration SQL | UPDATE rows + ALTER default |
| `src/types/clinicalCase.ts` | CaseType union, CASE_TYPE_LABELS, shouldShowImmediateFeedback |
| `src/types/virtualPatient.ts` | VPCaseType union, shouldShowImmediateFeedbackVP |
| `src/pages/VirtualPatientPage.tsx` | Default values, consequence fallback for advanced, comments |
| `src/components/admin/HelpTemplatesTab.tsx` | Template text with case_type, initial_state, consequence_text, state_delta |
| `src/components/clinical-cases/ClinicalCaseBulkUploadModal.tsx` | Parse case_type, initial_state_json, consequence_text, state_delta_json |
| `src/components/clinical-cases/ClinicalCaseQuickBuildModal.tsx` | Parse consequence_text and state_delta_json in stage blocks |
| `src/components/clinical-cases/CaseBuilderStageEditor.tsx` | Update help text references |

### What Stays Unchanged
- `case_mode` (read_case / practice_case / branched_case)
- `level` (beginner / intermediate / advanced)
- `feedback_timing` column in DB (kept as optional override)
- All existing cases remain functional (data migrated in-place)
- AI generation edge function (operates on stages, not case_type)




## Enhanced Essay Template with Optional Rubric Marking

### Overview
Add three new **optional** fields to essay questions -- `question_type`, `rubric_json`, and `max_points` -- and integrate them with the formative assessment rubric marking engine. All new columns are fully optional; existing essays and CSV uploads without these fields continue to work unchanged.

### Database Migration
Add three new nullable columns to the `essays` table:

| Column | Type | Default | Nullable | Notes |
|---|---|---|---|---|
| `question_type` | `text` | `NULL` | Yes | "Socratic" or "Essay"; displays as "Essay" in UI when NULL |
| `rubric_json` | `jsonb` | `NULL` | Yes | Grading rubric; falls back to keywords if absent |
| `max_points` | `integer` | `NULL` | Yes | 5-20 range; falls back to paper-level points if absent |

### Formative Assessment Integration
The Blueprint Exam Runner already auto-marks essays using `gradeWithRubric`. This enhancement adds per-essay granularity:
- If `rubric_json` exists on the essay, use it directly for marking criteria
- Otherwise fall back to current behavior (keywords as required_concepts)
- If `max_points` exists, use it for that essay's score; otherwise use the flat `paper.components.essay_points`

### File Changes

**1. Database migration**
- `ALTER TABLE essays ADD COLUMN question_type text;`
- `ALTER TABLE essays ADD COLUMN rubric_json jsonb;`
- `ALTER TABLE essays ADD COLUMN max_points integer;`
- All three columns are nullable with no defaults, so existing data is untouched.

**2. `src/components/admin/HelpTemplatesTab.tsx`**
- Update the `essay` entry in `TEMPLATES_SCHEMA`:
  - Add `question_type`, `rubric_json`, `max_points` to the columns list and the optional array
  - Update example rows to show sample values (all three fields can be left blank)

**3. `src/components/admin/AdminContentActions.tsx`**
- Extend `ParsedEssayRow` interface with optional `questionType?`, `rubricJson?`, `maxPoints?`, `keywords?`, `rating?`
- Add new headers to `knownHeaders`: `'question_type'`, `'rubric_json'`, `'max_points'`, `'keywords'`, `'rating'`
- Update `processEssayCSV` to parse the new columns only when present:
  - `keywords`: pipe-separated string to array (optional)
  - `rating`: numeric 5-20, skip validation if empty
  - `question_type`: string, left as NULL if empty
  - `rubric_json`: JSON.parse only if non-empty, row error if malformed
  - `max_points`: integer 5-20, skip if empty
- Update `bulkUploadEssays` mutation to conditionally include the new fields

**4. `src/lib/csvExport.ts`**
- Add optional columns to `ESSAY_EXPORT_COLUMNS`:
  - `question_type`: plain string
  - `max_points`: number
  - `keywords`: joined with `|`
  - `rubric_json`: `JSON.stringify` (empty string if null)
  - `rating`: number

**5. `src/components/content/EssaysAdminTable.tsx`**
- Add optional "Type" column showing `question_type` (or "Essay" if null)
- Add optional "Points" column showing `max_points` (or dash if null)

**6. `src/components/exam/BlueprintExamRunner.tsx`**
- Update essay marking logic:
  - If `essay.rubric_json` exists, use it as the rubric for `gradeWithRubric`
  - Otherwise, fall back to current keywords-based rubric
  - If `essay.max_points` exists, use it; otherwise use `paper.components.essay_points`

### Updated CSV Template

```text
title,scenario_text,questions,model_answer,keywords,rating,section_name,section_number,question_type,rubric_json,max_points
```

All of `keywords`, `rating`, `question_type`, `rubric_json`, and `max_points` can be left blank. A minimal valid row only needs `title` and `questions`.

### Rubric JSON Structure (optional)

```text
{
  "required_concepts": ["hemostasis", "inflammation"],
  "optional_concepts": ["MDT discussion"],
  "acceptable_phrases": {
    "hemostasis": ["blood clotting", "platelet plug"]
  },
  "critical_omissions": ["hemostasis"],
  "pass_threshold": 0.6
}
```

### Files to Modify

| File | Change Summary |
|---|---|
| Database migration | Add 3 nullable columns to `essays` |
| `HelpTemplatesTab.tsx` | Update essay template schema with optional fields |
| `AdminContentActions.tsx` | Extend parser for optional new fields |
| `csvExport.ts` | Add optional columns to export config |
| `EssaysAdminTable.tsx` | Add Type and Points columns (show fallback when null) |
| `BlueprintExamRunner.tsx` | Use per-essay rubric/points when available, fall back otherwise |


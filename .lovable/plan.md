

## Bulk Upload Clinical Cases + Fix Auto-Tag Description

This covers your questions and the immediate fix:

### Question Answers First

**1. Bulk upload clinical cases?**
Not currently supported -- but absolutely doable. Your uploaded TXT format is well-structured and can be parsed. This plan covers building that.

**2. Images/videos in cases?**
Not currently in the schema. This is a future enhancement that would require adding `image_url` and `video_url` columns to `virtual_patient_stages`. It is straightforward to add later -- each stage could optionally have an attached image or short video. Not included in this plan but easy to add as a follow-up.

**3. Branching (multi-arm) scenarios?**
The `branched_case` mode already exists in your type system but is marked "comingSoon". True branching would need a `next_stage_map` column on stages (e.g., if answer is A go to stage 3, if B go to stage 5). This is a larger feature -- the linear stage runner would need a branching engine. Not included here but the foundation exists.

### What This Plan Builds

**Part 1: Fix the auto-tag description** (quick fix)

Change the misleading text from:
> "Matches unassigned content to sections using saved section names from uploads."

To:
> "Uses keyword matching and AI to automatically assign unassigned content to the correct sections."

This accurately describes what the feature does now (keyword + AI fallback).

**Part 2: Bulk Upload Modal for Clinical Cases**

A new `ClinicalCaseBulkUploadModal` that:
- Accepts TXT files in your format (the format from your uploaded file)
- Parses multiple cases from a single file (separated by `---`)
- Shows a preview of parsed cases with stage counts before importing
- Creates cases + stages in the database on confirmation
- Supports `section_name` field for auto-section-assignment

**TXT Format Specification (matching your file):**
```text
# CLINICAL CASE 1 -- PRACTICE CASE
# Title: The Non-Healing Post-Operative Wound
# Intro: A 66-year-old male presents...
# Difficulty: medium
# Mode: Practice Case

STAGE 1:
TYPE: mcq
PATIENT_INFO: The patient's wound shows...
PROMPT: Which of the following...
CHOICES: (A) His age alone (B) Diabetes... (C) His elevated BMI (D) The bowel resection itself
CORRECT: B
EXPLANATION: Diabetes delays...
TEACHING_POINTS:
- Point 1
- Point 2

STAGE 2:
TYPE: short_answer
...
RUBRIC_REQUIRED:
- concept 1
- concept 2
RUBRIC_OPTIONAL:
- bonus concept
CORRECT: Model answer text

---

# CLINICAL CASE 2 -- PRACTICE CASE
...
```

**Part 3: Add "Bulk Upload" button to admin list**

Add a new button next to "Generate with AI" and "Add Case" in `ClinicalCaseAdminList`.

### Technical Details

**New file: `src/components/clinical-cases/ClinicalCaseBulkUploadModal.tsx`**

- Parser function `parseClinicalCasesTxt(text: string)` that:
  - Splits file on `---` separator
  - Extracts header fields (Title, Intro, Difficulty, Mode) from `# ` prefixed lines
  - Parses each `STAGE N:` block extracting TYPE, PATIENT_INFO, PROMPT, CHOICES, CORRECT, EXPLANATION, TEACHING_POINTS, RUBRIC_REQUIRED, RUBRIC_OPTIONAL
  - Maps difficulty: "medium" to "intermediate", "easy" to "beginner", "hard" to "advanced"
  - Maps mode: "Practice Case" to "practice_case", "Read Case" to "read_case"
  - Handles `read_only` stage type (no choices/correct needed)
  - Returns array of parsed cases with stages
- Preview UI showing each parsed case as a card with title, mode, difficulty, stage count
- Import button that creates all cases + stages using existing `useCreateClinicalCase` and `useCreateClinicalCaseStage` hooks
- Progress indicator during import
- Error handling for malformed files

**Modified file: `src/components/clinical-cases/ClinicalCaseAdminList.tsx`**

- Import and render `ClinicalCaseBulkUploadModal`
- Add "Bulk Upload" button with Upload icon

**Modified file: `src/components/sections/SectionsManager.tsx`**

- Update description text on line 323

### Files to Create/Modify

| File | Change |
|---|---|
| `src/components/clinical-cases/ClinicalCaseBulkUploadModal.tsx` | New: TXT parser + preview + import modal |
| `src/components/clinical-cases/ClinicalCaseAdminList.tsx` | Add bulk upload button and modal |
| `src/components/clinical-cases/index.ts` | Export new component |
| `src/components/sections/SectionsManager.tsx` | Fix auto-tag description text |




## Plan: Insert Case 01 and Adapt Components to Match the Real JSON Schema

### Problem

The user's JSON (the "real" case data) has a **significantly different structure** from what the current TypeScript types and components expect. The components will crash or show nothing if we simply insert the JSON as-is. Here's the mismatch summary:

| Section | Current Types Expect | User's JSON Has |
|---|---|---|
| **history_taking** | `patient_profile`, `system_prompt`, `categories[]` | `mode`, `atmist_handover`, `checklist[]`, `comprehension_questions[]` |
| **physical_examination** | `findings[]` (flat array with `region`, `finding`, `is_abnormal`) | `regions{}` (object keyed by region ID, each with `label` + `finding`) |
| **investigations_labs** | `available_labs[]` (array with `test_name`, `result`, `unit`, `reference_range`, `is_abnormal`) | `available_tests{}` (object keyed by test name, with `label`, `result`, `interpretation`, `is_key`, `points`) |
| **investigations_imaging** | `available_imaging[]` (array with `modality`, `body_part`, `finding`) | `available_imaging{}` (object keyed by name, with `label`, `result`, `interpretation`, `is_key`, `points`) |
| **diagnosis** | `expected_diagnosis` string + `differential_diagnoses[]` | `rubric{}` with `possible_diagnosis`, `differential_diagnosis`, `final_diagnosis` — each with `expected`, `points`, `model_answer` |
| **medical/surgical_management** | `mcqs[]` with `McqQuestion` shape (`options` have `key`, `text`, `is_correct`) | `questions[]` with `id`, `type`, `question`, `options` (string array like "A. ..."), `correct` (letter), `explanation`, `points`; surgical also has `free_text` type questions |
| **monitoring_followup** | `prompt` + `expected_answer` | `question` + `rubric{}` with `expected_points[]`, `model_answer`, `points` |
| **patient_family_advice** | `prompt` + `expected_answer` | `question` + `rubric{}` with `expected_points[]`, `model_answer`, `points` |
| **conclusion** | `ward_round_prompt` + `key_decisions[]` | `tasks[]` — array of task objects with `type` (ward_round_presentation, key_decision, learning_point), each with `instruction`, `rubric` |

### Approach

Since the user's JSON represents the **authoritative case format** (teacher-authored, not AI-generated), we should adapt the TypeScript types and all consuming components to support this richer schema. This is a one-time alignment that ensures all future cases follow this structure.

### Step-by-step

**1. Update `structuredCase.ts` types** to match the user's JSON schema exactly:
- Replace `HistorySectionData` with new shape supporting `mode`, `atmist_handover`, `checklist`, `comprehension_questions`
- Replace `PhysicalExamSectionData` to use `regions` object instead of flat `findings[]`
- Replace `LabsSectionData` to use `available_tests` object with `interpretation`, `is_key`, `points`
- Replace `ImagingSectionData` similarly
- Replace `DiagnosisSectionData` with rubric-based structure
- Replace `ManagementSectionData` with the `questions[]` array format (supporting both MCQ and free_text types)
- Replace `MonitoringSectionData` and `AdviceSectionData` with `question` + `rubric` shape
- Replace `ConclusionSectionData` with `tasks[]` array

**2. Update all 9 student-facing section runner components** to read the new data shapes:
- `HistoryTakingSection` — display ATMIST handover, then comprehension questions (not chat)
- `PhysicalExamSection` — iterate `Object.entries(data.regions)` instead of `data.findings[]`
- `InvestigationsLabsSection` — iterate `Object.entries(data.available_tests)`, show results with interpretation
- `InvestigationsImagingSection` — iterate `Object.entries(data.available_imaging)`
- `DiagnosisSection` — show three rubric prompts (possible, differential, final) as text areas
- `ManagementSection` — parse option strings ("A. ...") and handle both MCQ and free_text question types
- `MonitoringSection` — use `data.question` instead of `data.prompt`
- `AdviceSection` — use `data.question` instead of `data.prompt`
- `ConclusionSection` — render multiple tasks instead of a single ward_round_prompt

**3. Update `CasePreviewEditor.tsx`** section editors to display the new shapes correctly (the admin review/edit view).

**4. Update `score-case-answers` edge function** prompt to understand the new rubric-based scoring format (points per section, model answers, expected points).

**5. Insert the case into the database:**
- `module_id`: `153318ba-32b9-4f8e-9cbc-bdd8df9b9b10` (SUR-423)
- `chapter_id`: `f755eed3-3750-4a73-8028-a1a67003eeb9` (Wound Healing and Management)
- Transform the user's JSON into the `generated_case_data` column
- Set `active_sections`, `history_mode`, `delivery_mode`, `patient_language`, `chief_complaint`, patient metadata
- Set `is_published: true`, `is_ai_driven: false`

### Scope

This is a significant refactor touching ~15 files. The types file is the foundation — once updated, each component follows mechanically. The changes are:

- 1 types file
- 9 section runner components  
- 1 preview editor (with ~10 sub-editors)
- 1 edge function (scoring)
- 1 database insert

### Risk

Low risk of regression since the structured case system is new and has no production data yet.


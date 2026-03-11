

# Help Docs + JSON Import for Interactive Cases — Updated Plan

## Overview

Three deliverables:
1. **Guide doc** — "Interactive Cases — How It Works" (downloadable from Help & Templates)
2. **AI prompt doc** — "Interactive Cases — AI Generation Prompt" (downloadable, ready to paste into Claude/ChatGPT)
3. **JSON Import** — Upload button in the Interactive Cases admin list + navigation link to Help & Templates

All content will be written fresh inline (not copied from the outdated `docs/` file) to reflect the current state: voice preview with cooldown, per-case voice/tone/time-limit controls, move/copy, body map v8, ElevenLabs TTS, etc.

## Changes

### 1. `src/components/admin/HelpTemplatesTab.tsx`

**Add two new built-in templates** to `BUILTIN_TEMPLATES`:
- `interactive_case_guide` — format `txt`, title "Interactive Cases — How It Works"
- `interactive_case_prompt` — format `txt`, title "Interactive Cases — AI Prompt Template"

**Add two new download functions** with inline content:

**Guide content** (covers current reality):
- 10-section structure with Professional Attitude
- History Taking: full conversation (Egyptian Arabic chat + ElevenLabs voice), paramedic handover, triage note, witness account, no history
- Physical Exam: body map with 8 fixed regions (general, head_neck, vital_signs, chest, upper_limbs, abdomen, lower_limbs, extra), vitals grid
- Labs & Imaging: key/unnecessary penalty system
- Diagnosis: 3-part rubric (possible, differential, final)
- Management: MCQ + free-text with rubric scoring
- Monitoring, Advice, Conclusion: rubric-based free-text
- Scoring: 120 default total, AI-scored via edge function, 5-category summary report
- Anti-cheat: select-none, copy/paste blocked, watermark
- Admin workflow: Create Case dialog (5 tabs), Generate with AI vs Build Manually, Case Preview Editor features (voice character + preview with cooldown, patient tone, history time limit, section toggles, score recalculation, avatar picker, move/copy)
- Voice: ElevenLabs TTS, per-case voice override, preview button with 1-min cooldown, contact admin for new voices
- JSON import: upload a JSON file to create a draft case

**Prompt content** (updated JSON schema):
- Full schema matching `StructuredCaseData` type exactly
- Includes `case_meta`, `patient`, all 10 sections + `professional_attitude`
- Physical exam uses v8 `findings` record with `RegionKey` types
- Complete example (appendicitis) adapted from existing doc
- Instructions for the AI (10 rules)
- Note at top: "Copy this prompt, fill in placeholders, paste into Claude/ChatGPT, copy the JSON output, and upload it using the Import JSON button in KALMHUB"

**Wire into `generateTemplateDownload`** switch statement for both new IDs.

### 2. `src/components/clinical-cases/ClinicalCaseAdminList.tsx`

**Add "Import JSON" button** next to "Create Case":
- `Upload` icon + "Import JSON" label
- Hidden `<input type="file" accept=".json" />` triggered on click
- On file select:
  - Parse JSON, validate `case_meta.title` exists
  - Auto-derive `active_sections` from which section keys are present
  - Call `useCreateVirtualPatientCase` with `title`, `chief_complaint`, `level`, `estimated_minutes`, `generated_case_data`, `module_id`, `chapter_id`/`topic_id`, `is_published: false`, `patient_name`, `patient_age`, `patient_gender` from parsed data
  - Toast success → navigate to the new case's editor
  - Toast error on validation failure

**Add "Help & Templates" link** (small `HelpCircle` icon button) that navigates to `/admin?tab=help`:
- Placed in the toolbar next to Download button

### 3. No backend changes needed

The existing `virtual_patient_cases` table accepts `generated_case_data` as JSONB via `useCreateVirtualPatientCase`.


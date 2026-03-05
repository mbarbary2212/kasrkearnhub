
# Structured Interactive Cases — Implementation Plan

## Status: 🚧 In Progress

### Completed Steps

#### Step 1: Database Migration ✅
All schema changes applied successfully:
- `module_chapters`: Added `pdf_url`, `pdf_text`, `pdf_pages`, `pdf_uploaded_at`, `case_count`, `created_by`
- `virtual_patient_cases`: Added `history_mode`, `delivery_mode`, `patient_language`, `chief_complaint`, `additional_instructions`, `active_sections`, `section_question_counts`, `generated_case_data`
- Enforced FKs: `fk_cases_module_id` → `modules(id)`, `fk_cases_chapter_id` → `module_chapters(id)`
- Created `case_reference_documents` with XOR constraint (`case_or_chapter_not_both`)
- Created `case_section_answers` with `UNIQUE(attempt_id, section_type)`
- Created trigger `trg_update_chapter_case_count` (handles INSERT, UPDATE, DELETE)
- RLS policies on both new tables

#### Step 2: TypeScript Types ✅
- Created `src/types/structuredCase.ts` with all interfaces, enums, section labels, and summary category mapping

### Remaining Steps

| Step | Description | Status |
|------|-------------|--------|
| 3 | 5-tab StructuredCaseCreator dialog | ✅ |
| 4 | `generate-structured-case` edge function | ✅ |
| 5 | CasePreviewEditor screen | ⬜ |
| 6 | Section components (10 + checklist + missed items) | ⬜ |
| 7 | StructuredCaseRunner | ⬜ |
| 8 | `score-case-answers` edge function | ⬜ |
| 9 | CaseSummary screen | ⬜ |
| 10 | Router integration in VirtualPatientPage | ⬜ |

### Key Design Decisions
- Checklist PDFs are optional reference documents (not required)
- Only Professional Attitude + History Taking (A–E) from checklists matter for rubrics
- Teachers set their own `max_score` per section (not imported from PDF)
- 5-item final report: Professional Attitude, History Taking, Physical Exam, Investigations, Diagnosis & Management
- 10-section detail view available in expandable breakdown
- `generated_case_data` stores full case structure as JSONB
- Edge functions use `service_role` key to bypass RLS for AI scoring
- Professional attitude scored holistically from transcript at submission

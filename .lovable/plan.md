
# Structured Interactive Cases — Implementation Plan

## Status: ✅ Complete (Step 17 added)

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

### All Steps

| Step | Description | Status |
|------|-------------|--------|
| 3 | 5-tab StructuredCaseCreator dialog | ✅ |
| 4 | `generate-structured-case` edge function | ✅ |
| 5 | CasePreviewEditor screen | ✅ |
| 6 | Section components (10 + checklist + missed items) | ✅ |
| 7 | StructuredCaseRunner | ✅ |
| 8 | `score-case-answers` edge function | ✅ |
| 9 | CaseSummary screen | ✅ |
| 10 | Router integration in VirtualPatientPage | ✅ |
| 11 | Physical Examination v8 rewrite | ✅ |
| 12 | Two-Phase History Taking with AI Chat + Voice | ✅ |
| 13 | Dialect Fix + TTS Speed + Voice Registry + Per-Case Controls | ✅ |
| 14 | N+1 Progress API Optimization (RPC) | ✅ |
| 15 | Bound question_attempts + Deduplicate Dashboard Query | ✅ |
| 16 | History Counter + PE Merge Fix + Combined Exam Prompts | ✅ |

### Step 16: History Counter + PE Merge Fix + Combined Exam Prompts ✅
- **Question counter**: Removed `/15` denominator from both chat and voice mode — now shows `X questions asked` without pressuring students to hit a target
- **Patient diabetes denial**: Fixed `expected_behaviour` fallback in `patient-history-chat` — was `'N/A'` causing AI to deny conditions; now outputs label alone when no expected_behaviour exists
- **PE first-entry label**: Fixed `normalizePhysicalExamFindings` — first remapped entry (e.g. `abdomen_inspection` → `abdomen`) now gets `**Label:**` prefix matching subsequent merged entries
- **PE card scroll**: Added `max-h-[280px] overflow-y-auto` to expanded finding cards so long combined text is scrollable
- **AI generation prompt**: Updated `generate-structured-case` PE schema hints to explicitly require combining ALL exam components (inspection, palpation, percussion, auscultation, special tests) into a single text field per region with bold sub-headings
- **Help & Templates**: Updated template JSON example (abdomen shows combined format) and expanded rule 11 to mandate combining exam components per region

### Key Design Decisions
- Checklist PDFs are optional reference documents (not required)
- Only Professional Attitude + History Taking (A–E) from checklists matter for rubrics
- Teachers set their own `max_score` per section (not imported from PDF)
- 5-item final report: Professional Attitude, History Taking, Physical Exam, Investigations, Diagnosis & Management
- 10-section detail view available in expandable breakdown
- `generated_case_data` stores full case structure as JSONB
- Edge functions use `service_role` key to bypass RLS for AI scoring
- Professional attitude scored holistically from transcript at submission

### Physical Examination v8 Changes (Step 11)
- **Data model**: Fixed 8 `RegionKey` values (`general`, `head_neck`, `vital_signs`, `chest`, `upper_limbs`, `abdomen`, `lower_limbs`, `extra`)
- **New types**: `VitalSign`, `RegionFinding`, `VitalsFinding`, `ExtraFinding`, `TopicItem`
- **BodyMap.tsx**: Full rewrite with dark gradient panel, body figure image, SVG region labels/boxes, 3-state interactions (default/active/done)
- **PhysicalExamSection.tsx**: Teal gradient header, two-panel layout (figure + card-based findings), vitals grid, topic strip with modal
- **Edge functions**: Updated `generate-structured-case` prompt schema and `score-case-answers` scoring prompt
- **CasePreviewEditor**: Updated `PhysicalExamEditor` for new `findings` record shape with backward compat for old `regions`
- **Backward compat**: Old cases with `regions` key still work via fallback in editor and scoring prompt

### Step 13: Dialect Fix + TTS Speed + Voice Registry + Per-Case Controls ✅
- **Egyptian dialect reinforcement**: Updated `patient-history-chat` prompt with explicit Egyptian colloquial examples and repeated strict constraints (rules 10-11 + closing reminder)
- **TTS speed**: `elevenlabs-tts` now accepts and passes `speed` parameter (top-level, not inside voice_settings); default bumped to 1.1
- **Voice Registry**: New `tts_voices` DB table (like `examiner_avatars`) with RLS, seeded with all 10 existing voices
- **TTSVoicesCard**: Admin CRUD component in Platform Settings for managing ElevenLabs voices (add/edit/toggle active)
- **Per-case controls in CasePreviewEditor**: Voice Character dropdown (filtered by patient gender), History Time Limit input, Patient Tone moved to History Interaction card
- **Contact platform admin**: "Can't find the right voice?" link opens request dialog → notification to platform/super admins
- **Runner wiring**: `StructuredCaseRunner` passes `voiceIdOverride` and `historyTimeLimitMinutes` to `HistoryTakingSection`
- **HistoryTakingSection**: Uses per-case voice override and time limit when set, falls back to global defaults

### Step 14: N+1 Progress API Optimization ✅
- **Problem**: Sentry N+1 alert — `useChapterProgress` and `useContentProgress` each made ~17 sequential Supabase REST calls per page load
- **Solution**: Created single `get_content_progress(p_chapter_id, p_topic_id, p_user_id)` RPC using CTEs to aggregate all content totals and completion counts in one SQL query
- **RPC returns**: JSONB with `mcq_total/completed`, `essay_total/completed`, `osce_total/completed`, `case_total/completed`, `matching_total/completed`, `lectures` array, `video_progress` array
- **Video matching**: Kept client-side (video_id is YouTube/GDrive ID extracted via JS regex from video_url — not joinable in SQL)
- **Impact**: 17 API calls → 1 per chapter/topic page load
- **No breaking changes**: Hook interfaces unchanged, all consumer components unaffected

### Step 15: Bound question_attempts + Deduplicate Dashboard Query ✅
- **Problem**: `useTestProgress` and `useStudentDashboard` both fetched unbounded `select('*')` from `question_attempts`, duplicating ~80 lines of MCQ/OSCE/improvement calculation logic
- **Fix 1 — `useTestProgress.ts`**: Narrowed select to 4 used columns (`question_type, is_correct, selected_answer, created_at`) and added `.limit(100)` — ~90% data reduction
- **Fix 2 — `useStudentDashboard.ts`**: Removed duplicate `question_attempts` fetch entirely. Now accepts `testProgress?: TestProgressData` parameter from `useTestProgress`. Uses it for performance/improvement/readiness calculations. Eliminates one full unbounded query and ~80 lines of duplicate code
- **Fix 3 — `cache-readiness/index.ts`**: Same `.limit(100)` + narrowed select applied to edge function for consistency
- **Loading state**: Dashboard shows skeleton when `testProgressLoading` is true (not zeros). Zeros only appear when testProgress resolves with no data (new user)
- **Impact**: 2 unbounded queries → 1 bounded (100 rows, 4 cols). One entire fetch eliminated from dashboard load. Zero breaking changes

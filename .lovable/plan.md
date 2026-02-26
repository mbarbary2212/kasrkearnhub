

## Analysis: Current Case Complexity vs Proposed Simplification

**Current state** — Cases have 6 overlapping classification axes:
- `case_type`: basic / advanced
- `case_mode`: read_case / practice_case / branched_case
- `feedback_timing`: immediate / deferred
- `is_ai_driven`: boolean
- `status_panel_enabled`: boolean
- `case_type` in VP types: basic / advanced

This creates confusion for admins and students. Your instinct is correct — now that we have:
1. **AI-driven Cases** for dynamic clinical reasoning
2. **Pathways** for fixed decision trees

...the old subtypes are redundant.

## Proposed Simplification

**Cases = AI-driven OSCE simulations.** Every case is an AI conversation. Admin provides title, intro, learning objectives, difficulty, max turns. No stage builder needed.

**Pathways = Fixed branching content.** Linear/branching scenarios (what "read_case" and "branched_case" were) belong here — they're already decision trees.

### What gets removed
- `case_type` column (basic/advanced) — no longer needed
- `case_mode` column (read_case/practice_case/branched_case) — no longer needed
- `feedback_timing` column — AI cases always debrief at the end
- `status_panel_enabled` / `initial_state_json` — AI handles patient state narratively
- Stage builder (`ClinicalCaseBuilderModal`, `CaseBuilderStageEditor`, `CaseBuilderDetailsTab`) — no pre-written stages
- `ClinicalCaseStageFormModal` — no manual stage creation
- The `CASE_MODE_TABS` filter in the student view
- The `virtual_patient_case_stages` table becomes unused for new cases (keep for legacy data)

### What stays
- Case card UI (title, difficulty badge, estimated time, attempts/score)
- AI generate modal (but simplified — it IS the only creation flow now)
- `AICaseRunner` component (the chat UI)
- `run-ai-case` edge function
- `ai_case_messages` table
- Attempt tracking, scoring
- `learning_objectives`, `max_turns`, `is_ai_driven` columns

### What changes

| Area | Change |
|------|--------|
| **Admin "New Case" flow** | Single button → opens simplified form (title, intro, learning objectives, difficulty, max turns, tags). No case_mode/case_type selectors. Optional "Generate with AI" fills in title+intro from a topic. |
| **Case Card (student)** | Remove mode badges (Read/Practice/Branched). Show difficulty + "AI Case" badge. Show "X turns" instead of "X stages". |
| **VirtualPatientPage** | Always render `AICaseRunner`. Remove the old stage-based runner entirely. |
| **ClinicalCaseFormModal** | Strip case_mode, case_type, feedback_timing fields. Always set `is_ai_driven = true`. |
| **ClinicalCaseAdminList** | Remove stage count references. Show max_turns instead. Remove "Build Stages" button. |
| **Bulk upload (TXT)** | Simplify to just metadata (title, intro, objectives, difficulty). No stage parsing. |
| **Types** | Simplify `ClinicalCase` type — remove `case_mode`, `case_type`, `feedback_timing`, `status_panel_enabled`, `initial_state_json`. |
| **Migration** | Set all existing cases to `is_ai_driven = true`. Keep old stage data for reference but mark deprecated. |

### Migration strategy for existing content
- Existing "read_case" cases with fixed stages → admins can recreate them as Pathways (we can offer a one-click migration tool later)
- Existing "practice_case" cases → become AI-driven; their intro_text and learning objectives are preserved
- Old stage data stays in the DB but is no longer rendered

### Files to modify
| File | Action |
|------|--------|
| `src/types/clinicalCase.ts` | Remove CaseMode, CaseType, FeedbackTiming types; simplify ClinicalCase interface |
| `src/types/virtualPatient.ts` | Remove VPCaseType, VPFeedbackTiming; simplify |
| `src/components/clinical-cases/ClinicalCaseCard.tsx` | Remove mode badges; show "AI Case" + turns |
| `src/components/clinical-cases/ClinicalCaseFormModal.tsx` | Strip mode/type selectors; always AI-driven |
| `src/components/clinical-cases/ClinicalCaseAdminList.tsx` | Remove stage references; show turns |
| `src/components/clinical-cases/ClinicalCaseList.tsx` | Remove mode filter tab |
| `src/components/clinical-cases/ClinicalCaseBulkUploadModal.tsx` | Simplify to metadata-only parsing |
| `src/components/clinical-cases/ClinicalCaseAIGenerateModal.tsx` | Becomes the primary creation flow |
| `src/pages/VirtualPatientPage.tsx` | Always use AICaseRunner; remove stage runner |
| `src/hooks/useClinicalCases.ts` | Remove mode filtering; simplify create/update |
| `src/hooks/useVirtualPatient.ts` | Remove stage-runner logic |
| Migration SQL | Set `is_ai_driven = true` for all cases; optionally drop unused columns |

### Risk assessment
- **Low risk**: Student-facing changes are additive (better UI)
- **Medium risk**: Existing cases with stages lose their playable stages. Admins need to know.
- **Mitigation**: We can show a one-time admin banner: "Cases are now AI-driven. Previously staged cases can be converted to Pathways."


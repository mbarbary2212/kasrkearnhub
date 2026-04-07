
# Short Essay System — Full Redesign (Refined Plan)

## Critical Constraints (Applied Across All Phases)

### 🔴 C1: Strict Answer Isolation
- `model_answer` must NEVER be included in list/card/chapter queries
- Fetch `model_answer` ONLY when: (a) opening detail modal, (b) after grading completes
- All `useChapterEssays` list queries must use `.select('id, question, chapter_id, ...')` — explicitly excluding `model_answer`
- A separate `useEssayDetail(essayId)` hook fetches the full record including `model_answer` only on demand

### 🔴 C2: Rubric Priority & Locking
- `rubric_source`: `"admin"` | `"ai"`
- `rubric_status`: `"draft"` | `"approved"` | `"needs_review"`
- If `rubric_status = "approved"` → rubric is LOCKED: AI cannot overwrite, regeneration requires explicit admin action with confirmation
- Admin-created rubric is always primary; AI is fallback only
- If rubric missing/incomplete → allow AI generation, set `rubric_status: "draft"`, `rubric_source: "ai"`

### 🔴 C3: Grading Output Must Include
```json
{
  "score": number,
  "max_score": number,
  "percentage": number,
  "matched_points": [],
  "missed_points": [],
  "missing_critical_points": [],
  "confidence_score": number,
  "feedback": ""
}
```
- `confidence_score` (0-1) reflects clarity + completeness of student answer
- Critical concepts (`is_critical: true`) MUST always be flagged if missing

### 🟡 C4: Rubric Versioning
- All rubric_json includes `"rubric_version": 1`
- Future schema changes increment version; old versions are auto-migrated on read

### 🟡 C5: Backward Compatibility
- Old flat rubric format (`required_concepts: string[]`) still works
- `parseRubric()` utility normalizes any format to the new structured schema internally
- No data migration needed — conversion happens at read time

### 🟡 C6: UI Language
- Use `"Cover the main key points (≈ X)"` everywhere, not `"Cover X key points"`
- Applied in: Learning Mode badge, Test Yourself hint

---

## Rubric JSON Schema (Canonical)

```json
{
  "rubric_version": 1,
  "expected_points": 4,
  "required_concepts": [
    {
      "label": "Inflammatory phase",
      "description": "Student mentions inflammation or hemostasis appropriately",
      "is_critical": true,
      "acceptable_phrases": ["inflammatory phase", "hemostasis and inflammation"]
    }
  ],
  "optional_concepts": [
    {
      "label": "Growth factors",
      "description": "Mentions cytokines or growth factors",
      "acceptable_phrases": ["growth factors", "cytokines"]
    }
  ],
  "grading_notes": "",
  "model_structure": ["Definition", "Main points", "Conclusion"],
  "rubric_source": "admin|ai",
  "rubric_status": "draft|approved|needs_review"
}
```

---

## Phase 1: Rubric Structure + Admin UI + Answer Isolation + Generation

### 1A. Types & Parsing
| File | Action |
|---|---|
| `src/types/essayRubric.ts` | **Create** — TypeScript types for structured rubric with `rubric_version` |
| `src/lib/rubricMarking.ts` | **Modify** — Add `parseRubric()` that normalizes old flat format → new structured format; backward compatible |

### 1B. Answer Isolation (C1)
| File | Action |
|---|---|
| `src/components/content/EssayList.tsx` | **Modify** — Query excludes `model_answer`; pass only `id, question, rubric_json, max_points, keywords, chapter_id, section_id, display_order, is_deleted` |
| `src/hooks/useChapterContent.ts` | **Modify** — `useChapterEssays` select excludes `model_answer` |
| `src/components/content/EssayDetailModal.tsx` | **Modify** — Fetch `model_answer` on-demand only when "Show Answer" clicked; add "Cover the main key points (≈ X)" badge using `parseRubric()` |

### 1C. Admin Rubric Editor (C2)
| File | Action |
|---|---|
| `src/components/admin/EssayRubricEditor.tsx` | **Rewrite** — Full structured editor: status badge (Draft/Approved/Needs Review), source badge (Admin/AI), expected_points input, required concepts rows (label, description, critical toggle, synonyms), optional concepts rows, grading notes textarea, model structure textarea, action buttons (Generate/Regenerate/Approve/Reset), validation before approval, lock warning if status=approved |

### 1D. Generation Prompts (C4)
| File | Action |
|---|---|
| `supabase/functions/generate-essay-rubric/index.ts` | **Modify** — Output new structured format with `rubric_version: 1`, `expected_points` (infer from question if not explicit, default 3-6), `is_critical` flags, `rubric_source: "ai"`, `rubric_status: "draft"` |
| `supabase/functions/generate-content-from-pdf/index.ts` | **Modify** — Essay generation includes `rubric_json` in output; questions must be structured/bullet-point-answerable, not vague |

---

## Phase 2: Test Yourself + AI Grading

### 2A. Short Questions Tab
| File | Action |
|---|---|
| `src/components/exam/ChapterMockExamSection.tsx` | **Modify** — Add `'short_essay'` as third content type; fetch essays (excluding `model_answer`) |

### 2B. ShortEssayExam Component
| File | Action |
|---|---|
| `src/components/exam/ShortEssayExam.tsx` | **Create** — Question only + textarea + submit; Guided/Exam mode toggle (Guided shows "Cover the main key points (≈ X)", Exam hides it); no model answer, no rubric details shown |

### 2C. AI Grading Edge Function (C3)
| File | Action |
|---|---|
| `supabase/functions/grade-short-essay/index.ts` | **Create** — Receives `essay_id` + `student_answer`; fetches essay + rubric; respects C2 (use approved rubric if exists); strict examiner prompt; returns full grading output per C3 schema including `confidence_score` and `missing_critical_points`; falls back to local rubricMarking if AI unavailable |

### 2D. Results UI
| File | Action |
|---|---|
| `src/components/exam/ShortEssayResult.tsx` | **Create** — Score card, covered/missed points, critical missed points warning section, confidence indicator, AI feedback, model answer accordion (revealed after grading) |

---

## Phase 3: Quality & Polish

### 3A. Rubric Quality Warnings
- In `EssayRubricEditor.tsx`: warn if no required concepts, expected_points missing, question too vague, no critical concepts identified
- Warning: "Rubric is too weak for AI grading"

### 3B. AI Rubric Comparison View (Optional)
| File | Action |
|---|---|
| `src/components/admin/RubricComparisonView.tsx` | **Create** — Side-by-side: current admin rubric vs AI suggestion; Replace/Merge/Keep buttons |

---

## Files Summary

| File | Phase | Action |
|---|---|---|
| `src/types/essayRubric.ts` | 1A | Create |
| `src/lib/rubricMarking.ts` | 1A | Modify |
| `src/components/content/EssayList.tsx` | 1B | Modify |
| `src/hooks/useChapterContent.ts` | 1B | Modify |
| `src/components/content/EssayDetailModal.tsx` | 1B | Modify |
| `src/components/admin/EssayRubricEditor.tsx` | 1C | Rewrite |
| `supabase/functions/generate-essay-rubric/index.ts` | 1D | Modify |
| `supabase/functions/generate-content-from-pdf/index.ts` | 1D | Modify |
| `src/components/exam/ChapterMockExamSection.tsx` | 2A | Modify |
| `src/components/exam/ShortEssayExam.tsx` | 2B | Create |
| `supabase/functions/grade-short-essay/index.ts` | 2C | Create |
| `src/components/exam/ShortEssayResult.tsx` | 2D | Create |
| `src/components/admin/RubricComparisonView.tsx` | 3B | Create (optional) |

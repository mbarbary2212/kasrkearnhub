

# Enhanced Exam Settings -- Admin Blueprint Controls

## What Changes

Replace the current simple "Exam Settings" card (2 fields: question count + seconds per question) with a full **Exam Blueprint Builder** that lets admins configure the complete exam structure for their module.

## New Admin UI Layout

```text
+-----------------------------------------------+
| Exam Settings                                  |
| Configure the final exam structure              |
|                                                 |
| [Exam Categories]                               |
|   [x] Written    [ ] Practical                  |
|                                                 |
| --- Written Papers ---                          |
| Number of Papers: [3]                           |
|                                                 |
| Paper 1: [Written Paper 1___]                   |
|   MCQ Count:        [50]   Points each: [1]     |
|   Short Essay Count: [10]  Points each: [5]     |
|   Duration (minutes): [180]                     |
|   Instructions: [textarea_________]             |
|   Chapters: [multi-select from module chapters] |
|                                                 |
| Paper 2: [Written Paper 2___]                   |
|   MCQ Count:        [40]   Points each: [1]     |
|   Short Essay Count: [5]   Points each: [5]     |
|   Duration (minutes): [120]                     |
|   ...                                           |
|                                                 |
| --- Practical Papers (if enabled) ---           |
| Paper: [OSCE___]                                |
|   OSCE Stations:    [15]   Points each: [10]    |
|   Seconds/Station:  [150]                       |
|   Clinical Cases:   [2]    Points each: [20]    |
|   POXA Stations:    [10]   Points each: [5]     |
|   Duration (minutes): [90]                      |
|   ...                                           |
|                                                 |
| [Save Blueprint]                                |
+-----------------------------------------------+
```

## Technical Details

### Database Changes

Add new columns to `mock_exam_settings` table (or create a new `exam_blueprint_config` jsonb column):

**Option: Add a `blueprint_config` JSONB column to `mock_exam_settings`**

This avoids creating new tables for Phase 1 and stores the full structure in a single JSON blob alongside the existing simple settings.

```sql
ALTER TABLE mock_exam_settings
ADD COLUMN blueprint_config jsonb DEFAULT NULL;
```

The JSON structure:

```json
{
  "categories": ["written"],
  "papers": [
    {
      "name": "Written Paper 1",
      "category": "written",
      "order": 1,
      "duration_minutes": 180,
      "instructions": "Answer all questions...",
      "chapter_ids": ["uuid1", "uuid2"],
      "components": {
        "mcq_count": 50,
        "mcq_points": 1,
        "essay_count": 10,
        "essay_points": 5
      }
    },
    {
      "name": "OSCE",
      "category": "practical",
      "order": 4,
      "duration_minutes": 90,
      "instructions": "",
      "chapter_ids": [],
      "components": {
        "osce_count": 15,
        "osce_points": 10,
        "osce_seconds_per_station": 150,
        "clinical_case_count": 2,
        "clinical_case_points": 20,
        "poxa_count": 10,
        "poxa_points": 5
      }
    }
  ]
}
```

### Hook Changes (`useMockExam.ts`)

- Extend `MockExamSettings` interface to include `blueprint_config`
- Extend `useUpdateMockExamSettings` mutation to accept and save `blueprint_config`

### Component Changes

**Replace `MockExamAdminSettings.tsx`** with a richer component:

1. **Category toggles** -- checkboxes for Written and Practical
2. **Written section** (if enabled):
   - Number input for paper count (1-5)
   - For each paper: collapsible card with name, MCQ count, essay count, points per each, duration, instructions textarea, chapter multi-select
   - MCQ count and essay count can each be 0
3. **Practical section** (if enabled):
   - Single or multiple practical papers
   - OSCE station count + seconds per station + points
   - Clinical case count + points
   - POXA station count + points
   - Duration
4. **Summary row** showing total marks and total time
5. **Save button** that upserts both the simple settings (question_count, seconds_per_question for backward compat) and the `blueprint_config` JSON

### Chapter Selector

Reuse the module's chapters data already passed to `ModuleFormativeTab`. The admin settings component will receive chapters as a prop and render a multi-select (checkboxes) for each paper.

### Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/add_blueprint_config.sql` | Add `blueprint_config` jsonb column to `mock_exam_settings` |
| `src/components/exam/MockExamAdminSettings.tsx` | Replace with full blueprint builder UI |
| `src/components/exam/ExamPaperConfig.tsx` | New: collapsible card for configuring one paper |
| `src/components/exam/ExamChapterSelector.tsx` | New: multi-select chapter picker for a paper |
| `src/hooks/useMockExam.ts` | Extend interfaces and mutation to handle `blueprint_config` |
| `src/components/module/ModuleFormativeTab.tsx` | Pass `chapters` prop to `MockExamAdminSettings` |

### Backward Compatibility

- The existing simple `question_count` and `seconds_per_question` fields remain and continue to drive the current "Full Module Mock Exam" student experience
- The new `blueprint_config` is purely additive -- it will power the upcoming Final Exam Simulation system (Phase 4+)
- If `blueprint_config` is null, the admin sees only the current simple settings (graceful fallback)




## Remove duplicate sections and prevent future duplicates

### Current state

There are **45 duplicate section groups** across multiple chapters — same name in the same chapter. The duplicate (later-created) sections have real content attached: 111 MCQs, 4 blueprint configs, 1 mind map, and 4 study resources. This content must be reassigned to the keeper section before deleting duplicates.

Additionally, some chapters have multiple different sections sharing the same `section_number` (e.g., chapter `81aa5e42` has 6 different sections all numbered "7.1"). These are not name-duplicates but numbering collisions — they need flagging, not deletion.

### Plan

**Step 1 — Migration: Reassign content and delete duplicates**

A single SQL migration that:
1. For each duplicate group (same `chapter_id` + `LOWER(TRIM(name))`), keeps the earliest-created section as the "keeper"
2. Reassigns all child records from duplicate sections to the keeper: `mcqs`, `chapter_blueprint_config`, `mind_maps`, `study_resources`, `case_scenarios`, `concepts`, `essays`, `matching_questions`, `mcq_sets`, `osce_questions`, `practicals`, `resources`, `true_false_questions`, `virtual_patient_cases`, `interactive_algorithms`, `lecture_sections`, `lectures`
3. Deletes the duplicate sections
4. Adds a **unique index** on `sections(chapter_id, LOWER(TRIM(name)))` to prevent future name duplicates within a chapter
5. Same for topic sections: unique index on `sections(topic_id, LOWER(TRIM(name)))` where `topic_id IS NOT NULL`

**Step 2 — Frontend: duplicate guard on section creation**

File: `src/hooks/useSections.ts`

In `useCreateSection`, before inserting, query for an existing section with the same normalized name in the same chapter/topic. If found, show a toast error "A section with this name already exists" and abort.

File: `src/hooks/useExtractSections.ts`

In the AI/PDF extraction insert flow, add a conflict-handling approach: filter out sections whose names already exist in the chapter before inserting.

**Step 3 — Admin UI: flag potential duplicates (section number collisions)**

File: `src/hooks/useSections.ts`

Add a utility hook `useSectionDuplicateWarnings(chapterId)` that returns section IDs with duplicate `section_number` values. This is informational only — shown as a warning icon in the section list.

### Files to modify

| File | Change |
|------|--------|
| New migration SQL | Reassign content, delete dupes, add unique indexes |
| `src/hooks/useSections.ts` | Duplicate name check before insert; duplicate-number warning hook |
| `src/hooks/useExtractSections.ts` | Filter duplicates before bulk insert |


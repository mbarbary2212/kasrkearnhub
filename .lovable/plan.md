
# Unified Case Builder Redesign

## Problem
The current Case Builder requires navigating through 3 separate modal windows to manage a single case:
1. **Case Builder modal** -- shows summary + stages list
2. **Edit Details modal** (opened from Builder) -- title, intro, chapter, section, level, time, tags, published toggle
3. **Stage Form modal** (opened from Builder) -- individual stage editing

This is counter-intuitive. The "Edit Details" modal also lacks a **Concept** selector, and the "tags" field is unclear. Scrolling may also be broken in the edit flow.

## Solution
Consolidate everything into a **single-modal tabbed interface** with two tabs:

### Tab 1: "Details" (inline, no sub-modal)
All case metadata fields displayed directly inside the builder:
- Title
- Introduction text
- Chapter selector
- Section selector (conditional)
- Concept selector (new -- requires adding `concept_id` column to `virtual_patient_cases`)
- Difficulty level
- Estimated time
- Tags (with clarifying label: "Search Tags")
- Published toggle (with stage-count validation)

### Tab 2: "Stages" (current stage list)
- Drag-and-drop stage list (unchanged)
- Add Stage / Quick Build buttons
- Stage edit/delete actions
- Empty state with prompts

The stage edit form remains a sub-modal (it's a complex form with dynamic fields) -- this is fine since it's an intentional drill-down action.

## Database Change
Add `concept_id` column to `virtual_patient_cases` table with a foreign key to `concepts(id)`.

## Technical Details

### Migration SQL
```text
ALTER TABLE virtual_patient_cases
ADD COLUMN concept_id UUID REFERENCES concepts(id) ON DELETE SET NULL;
```

### Files to edit

**1. `supabase/migrations/` -- new migration**
- Add `concept_id` column to `virtual_patient_cases`

**2. `src/integrations/supabase/types.ts`**
- Add `concept_id` to `virtual_patient_cases` Row/Insert/Update types and Relationships

**3. `src/types/clinicalCase.ts`**
- Add `concept_id?: string | null` to `ClinicalCase` interface
- Add `concept_id?: string` to `ClinicalCaseFormData` interface

**4. `src/components/clinical-cases/ClinicalCaseBuilderModal.tsx` -- major rewrite**
- Remove the `ClinicalCaseFormModal` sub-modal import and usage
- Add a `Tabs` component with "Details" and "Stages" tabs
- **Details tab**: inline all fields from `ClinicalCaseFormModal` (title, intro, chapter, section, concept, level, time, tags, published toggle) with a "Save" button
- **Stages tab**: keep the existing drag-and-drop stage list, Add Stage, Quick Build, and empty state
- Use native `div` with `flex-1 min-h-0 overflow-y-auto` for scrolling (per project convention)
- Remove the "Edit Details" button from the case info summary card

**5. `src/components/clinical-cases/ClinicalCaseFormModal.tsx`**
- Keep this file for the "Create new case" flow (step 1 of 2) -- it's still needed when creating a brand-new case from the admin list
- Add `ConceptSelect` component
- Rename tags label to "Search Tags (optional)" for clarity

**6. `src/hooks/useClinicalCases.ts`**
- Include `concept_id` in create/update mutation payloads
- Include `concept:concepts(id, title)` in the select query for `useClinicalCase`

**7. `src/components/admin/MissingConceptsAudit.tsx`**
- Add `virtual_patient_cases` to the content types checked for missing concepts

### UI Layout (Details tab inside Builder)

```text
+------------------------------------------+
| Case Builder    [Draft]  [3 stages]    X |
|------------------------------------------|
| [Details]  [Stages]                      |
|------------------------------------------|
|  Title *                                 |
|  [________________________]              |
|                                          |
|  Introduction *                          |
|  [________________________]              |
|  [________________________]              |
|                                          |
|  Chapter        | Difficulty             |
|  [v Chapter 14] | [v Beginner]           |
|                                          |
|  Section        | Est. Time              |
|  [v Chronic..]  | [15] min               |
|                                          |
|  Concept (optional)                      |
|  [Select concept...]                     |
|                                          |
|  Search Tags (optional)                  |
|  [tag input] [Add]                       |
|  [tag1] [tag2]                           |
|                                          |
|  Published   .................. [toggle]  |
|------------------------------------------|
|                          [Save Changes]  |
+------------------------------------------+
```

### Scrolling fix
The Details tab content uses a native `div` with `flex-1 min-h-0 overflow-y-auto` to ensure scrolling works from anywhere in the content area, following the project's established scroll hierarchy pattern.

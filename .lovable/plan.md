

# Add Concepts Manager + Student Concept Filter

## Overview
Create a **ConceptsManager** (admin CRUD panel) mirroring the existing SectionsManager, and a **ConceptFilter** (student-facing dropdown) shown alongside the SectionFilter. Both filters appear simultaneously so students can combine them (e.g., filter by Section 3.1 AND Concept "Hypertension").

## What Gets Built

### 1. New Component: `ConceptsManager` (Admin CRUD)
**File:** `src/components/concepts/ConceptsManager.tsx`

A collapsible card identical in structure to `SectionsManager`, placed right below it on Chapter and Topic pages (admin only). Features:
- Enable/disable toggle (requires a new `concepts_enabled` column on `module_chapters` and `topics` tables, or we reuse the existing concepts presence as the "enabled" indicator)
- List existing concepts for the chapter/topic with edit and delete buttons
- Inline "Add Concept" input with create-on-enter
- Drag-and-drop reordering (using dnd-kit, same as sections)
- Delete confirmation dialog
- Uses the existing `useConcepts` hook and adds `useUpdateConcept` and `useDeleteConcept` mutations

### 2. New Component: `ConceptFilter` (Student-Facing)
**File:** `src/components/concepts/ConceptFilter.tsx`

A dropdown pill styled identically to `SectionFilter` but with a different icon (e.g., `Tag` or `Bookmark` from lucide). Shows "All Concepts" by default, lists all concepts for the chapter/topic, and lets the student pick one to filter content.

### 3. New Hooks: Update + Delete Concept
**File:** `src/hooks/useConcepts.ts` (existing, extend)

Add:
- `useUpdateConcept()` -- rename a concept
- `useDeleteConcept()` -- remove a concept (content becomes untagged)
- `useReorderConcepts()` -- update `display_order` (requires adding a `display_order` column to `concepts` table)

### 4. Database Migration
- Add `display_order INTEGER DEFAULT 0` column to `concepts` table (for drag-and-drop ordering)
- No `concepts_enabled` toggle needed -- if concepts exist, the filter shows; if none exist, it hides (same pattern as SectionFilter)

### 5. Wire Into Chapter + Topic Pages
**Files:** `src/pages/ChapterPage.tsx`, `src/pages/TopicDetailPage.tsx`

- Import `ConceptsManager` and render below `SectionsManager` (admin only)
- Import `ConceptFilter` and render next to `SectionFilter` in both Resources and Practice sections
- Add `selectedConceptId` state
- Pass `selectedConceptId` down to content list components for filtering

### 6. Content Filtering by Concept
Update content list components / hooks to accept an optional `conceptId` filter parameter and add `.eq('concept_id', conceptId)` to their Supabase queries when set.

### 7. Barrel Export
**File:** `src/components/concepts/index.ts`

Export `ConceptsManager` and `ConceptFilter`.

## Technical Details

```text
Chapter/Topic Page Layout (Admin View)
+---------------------------------------+
| [SectionsManager - collapsible card]  |
| [ConceptsManager - collapsible card]  |  <-- NEW
+---------------------------------------+
| Nav Rail | Content Area               |
|          | [SectionFilter] [ConceptFilter] <-- side by side
|          | [Sub-tabs: Videos, MCQs...] |
|          | [Content List]              |
+---------------------------------------+
```

The ConceptFilter only renders when concepts exist for the chapter/topic (same auto-hide logic as SectionFilter). Students can use both filters simultaneously -- content is filtered by section AND concept when both are selected.




## Redesign Admin Exam Management UI

The current admin interface mixes all papers together and opens all papers when editing. This plan creates a clearer, organized structure.

### New Layout

```text
+------------------------------------------+
|          Exam Management                  |
|  Configure exam blueprints for students   |
+------------------------------------------+
|  [ Written ]  [ Practical ]    <- Tabs    |
+------------------------------------------+
|  Existing Papers | + New Paper  <- Sub-tabs|
+------------------------------------------+
|  Written Paper 1  210 marks  180 min [Edit]|
|  Written Paper 2   50 marks  180 min [Edit]|
+------------------------------------------+
```

### Changes

**File: `src/components/module/ModuleFormativeTab.tsx`** (Admin section)

- Replace the two collapsible sections with a **Tabs** component at the top level: "Written" and "Practical" tabs
- Inside each tab, add **two sub-tabs**: "Existing Papers" (lists papers of that category with summary + Edit button) and "New Paper" (shows the add form for that category)
- The **Edit button** sets a `editingPaperIndex` state to open only that specific paper's `ExamPaperConfig` inline, replacing the list view temporarily (with a "Back to list" button)
- Essay Settings and Save button remain at the bottom, outside the tabs
- Summary badges (total marks, total minutes, paper count) stay at the bottom

**File: `src/components/exam/MockExamAdminSettings.tsx`**

- Refactor to accept the new tabbed structure. The Written/Practical checkboxes become implicit based on which tab has papers
- Extract the paper list + edit logic so individual papers can be edited in isolation
- The "Add Paper" action lives inside the "New Paper" sub-tab and auto-creates a paper with defaults, then opens it for editing

### Technical Details

**State additions in `ModuleFormativeTab.tsx`:**
- `activeCategory: 'written' | 'practical'` -- top-level tab
- `activeSubTab: 'existing' | 'new'` -- sub-tab within category
- `editingPaperIndex: number | null` -- when set, shows only that paper's config form

**Edit flow:**
1. Admin clicks Edit on "Written Paper 1"
2. `editingPaperIndex` is set to that paper's index in the papers array
3. The "Existing Papers" list is replaced by the single `ExamPaperConfig` for that paper
4. A "Back" button returns to the list view
5. Changes are held in state until "Save Settings" is clicked

**New Paper flow:**
1. Admin clicks the "New Paper" sub-tab
2. A new paper is auto-created with defaults for the active category
3. The `ExamPaperConfig` form opens immediately for editing
4. Admin configures and clicks "Save Settings"

**Category enablement:**
- Written/Practical checkboxes are removed; categories are automatically enabled based on whether papers exist in that category
- If an admin deletes all written papers, the written category is automatically disabled on save

### Files Modified
- `src/components/module/ModuleFormativeTab.tsx` -- New tabbed admin UI with edit-single-paper flow
- `src/components/exam/MockExamAdminSettings.tsx` -- Refactored to support tabbed layout, single-paper editing, and implicit category detection




## Plan: Add Manual Entry, Back Button, and Admin Instructions

### 3 Changes

**1. CasePreviewEditor — Add manual entry option alongside AI generation**

When no `generated_case_data` exists, instead of just showing "Generate Content", show two options:
- **Generate with AI** (existing button) — calls `generate-structured-case`
- **Start from Scratch** — creates an empty `generated_case_data` skeleton based on `active_sections`, so the admin can fill in each section manually using the existing inline editors

The skeleton generator will create empty but valid structures for each active section (empty arrays for findings, empty MCQs, etc.) so the section editors render and the admin can type values directly.

This means no new components — the existing section editors in `CasePreviewEditor` already support editing. We just need to seed them with an empty template.

**File: `src/components/clinical-cases/CasePreviewEditor.tsx`**
- Replace the "No Content Generated Yet" card with two side-by-side cards: "Generate with AI" and "Build Manually"
- Add a `createEmptySkeleton(activeSections)` helper that returns a valid `StructuredCaseData` with empty/default values for each section
- When "Build Manually" is clicked, set `editedData` to the skeleton and auto-save it to the database

**2. StructuredCaseRunner — Add Exit/Back button**

**File: `src/components/clinical-cases/StructuredCaseRunner.tsx`**
- Add an `AlertDialog` for exit confirmation
- Add a "Back to Cases" button (ArrowLeft + DoorOpen icon) in the progress header card, next to the case title
- On confirm: navigate back using `navigate(-1)` (browser back behavior, which takes the student to the Interactive tab they came from)

**3. StructuredCaseCreator — Add collapsible admin instructions**

**File: `src/components/clinical-cases/StructuredCaseCreator.tsx`**
- Add a `Collapsible` section between `DialogHeader` and `Tabs`
- Contains placeholder instruction text that the admin can reference
- Default collapsed, toggleable with "How to create a case" trigger
- Content will be placeholder text (the user said "we will fill that in time")

### Technical Details

**Empty skeleton structure** (for manual entry):
```typescript
function createEmptySkeleton(sections: SectionType[]): StructuredCaseData {
  const data: any = {
    professional_attitude: {
      max_score: 10,
      items: [
        { key: "introduction", label: "Introduced themselves", label_ar: "...", expected_behaviour: "..." },
        // ... standard 5 items
      ],
      scoring_note: "Scored holistically from transcript"
    }
  };
  
  if (sections.includes('history_taking')) {
    data.history_taking = { patient_profile: { name: "", age: 0, gender: "male" }, system_prompt: "", categories: [], max_score: 30 };
  }
  // ... similar for each section type
  return data;
}
```

No database changes needed. No new edge functions. All three changes are frontend-only.


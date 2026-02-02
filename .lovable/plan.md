
# Plan: Fix Batch Generation by Requiring PDF Document Selection

## Problem Summary
When you click "Batch Generate" from the PDF Library header, no PDF document is selected. The batch job is created with `document_id: null`, causing all content generation to fail with "Missing required fields: document_id".

---

## Root Cause Analysis

The issue is in the flow between components:

1. **PDF Library Header Button** (line 490):
   ```typescript
   <Button variant="outline" onClick={() => setBatchGeneratorOpen(true)}>
   ```
   This opens the batch modal but does NOT set `selectedDocForAI`.

2. **Document Card "Use as AI Source"** (line 468-472):
   ```typescript
   setSelectedDocForAI(doc);
   setAiFactoryOpen(true);  // Opens single-item factory, NOT batch
   ```
   This sets the document but opens the wrong modal.

3. **Batch Modal** receives `documentId: undefined` and creates a job with null document.

---

## Solution

### Option 1: Require Document Selection in Batch Modal

Add a document picker dropdown to the batch generator modal. The "Create Batch Job" button will be disabled until a document is selected.

**Changes:**
- Add document selector dropdown to `AIBatchGeneratorModal.tsx`
- Make document selection required before submission
- Remove the separate "Batch Generate" header button (or make it open a PDF-first picker)

### Implementation Details

**File: `src/components/admin/AIBatchGeneratorModal.tsx`**

1. Add state for selected document
2. Fetch available documents using existing `useAdminDocuments` hook
3. Add document selector UI between module/chapter selection
4. Validate document is selected before enabling submit

**File: `src/components/admin/PDFLibraryTab.tsx`**

1. Update "Batch Generate" button to require document selection first
   - Option A: Show toast "Please select a PDF first"
   - Option B: Keep modal but modal now has document picker

---

## Technical Changes

### AIBatchGeneratorModal.tsx

Add document selection:
```typescript
// Add state
const [selectedDocId, setSelectedDocId] = useState(documentId || '');

// Fetch documents
const { data: documents } = useAdminDocuments({
  module_id: selectedModuleId || undefined,
});

// Add UI element (between Module/Chapter and Content Types)
<Select value={selectedDocId} onValueChange={setSelectedDocId}>
  <SelectTrigger>
    <SelectValue placeholder="Select PDF document *" />
  </SelectTrigger>
  <SelectContent>
    {documents?.map(doc => (
      <SelectItem key={doc.id} value={doc.id}>
        {doc.title}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

// Update submit validation
disabled={!selectedDocId || !selectedModuleId || selectedTypes.length === 0}

// Pass selected document to create mutation
document_id: selectedDocId,
```

### PDFLibraryTab.tsx (optional improvement)

Remove the confusing top-level "Batch Generate" button, or make it work like "Use as AI Source" by requiring document selection first.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/admin/AIBatchGeneratorModal.tsx` | Add required document selector |
| `src/components/admin/PDFLibraryTab.tsx` | Remove or update header "Batch Generate" button |

---

## Testing

After changes:
1. Open PDF Library
2. Click on a PDF card's "Use as AI Source" button
3. Or open Batch Generate and select a document first
4. Complete the batch configuration
5. Start the job and verify it generates content successfully

---

## Expected Outcome

- Batch jobs will always have a valid `document_id`
- No more "Missing required fields" errors
- Content will actually be generated from the selected PDF

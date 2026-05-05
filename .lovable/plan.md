## Problem

In the Visual Resources tab, clicking **Bulk Upload** on **Infographics** opens the shared `MindMapBulkUploadModal`. On the first click it sometimes shows the Mind Map configuration (PDF-only file picker, "Upload N PDFs" button label) and only behaves correctly as an Infographics uploader on the second attempt.

### Root cause

`MindMapBulkUploadModal` is mounted permanently in `ChapterPage.tsx` and `TopicDetailPage.tsx`. Its `resourceType` prop is driven by a `visualBulkType` state that defaults to `'mind_map'`. The handler does:

```
setVisualBulkType('infographic');
setMindMapBulkOpen(true);
```

The dialog's `<input type="file" accept=...>` is already in the DOM with the old `accept` value when the user clicks **Choose Files**, and the upload-button label ("Upload N PDFs") is hard-coded. Result: first attempt looks like a PDF-only uploader; only after closing and reopening does it pick up the right config.

A second smaller issue: the file-validation toast message says "Please select PDF files only" even when type is infographic in some flows, and the CTA always says "PDFs".

## Fix

### 1. `src/components/study/MindMapBulkUploadModal.tsx`
- Replace hard-coded "PDF" copy in the upload button with `config.label` (e.g. "Upload 3 Files").
- Ensure validation/toast uses `config.label`.
- Reset `items` state whenever the modal closes (so reopening with a different `resourceType` starts clean).
- Add `key={resourceType}` to the internal drop zone block (or guard the `<input accept>` so it always reflects current `config.accept`).

### 2. `src/pages/ChapterPage.tsx` and `src/pages/TopicDetailPage.tsx`
Mount the modal conditionally so it gets a fresh instance with the correct `resourceType` every time:

```tsx
{mindMapBulkOpen && (
  <MindMapBulkUploadModal
    open
    onOpenChange={setMindMapBulkOpen}
    chapterId={chapterId}      // or topicId
    moduleId={moduleId}
    resourceType={visualBulkType}
  />
)}
```

This guarantees the first click after switching from Mind Map to Infographic (or vice versa) opens with the right accepted file types and labels.

### 3. (Minor polish) `src/components/study/InfographicForm.tsx`
Single-add already accepts `image/*,.pdf`. No change needed, but I'll verify the label reads "Image or PDF" (it does).

## Out of scope

- No schema changes.
- No change to the single-item Add Infographic flow beyond verification.
- Mind Map bulk upload behavior unchanged for PDFs.

## Verification

- Open a chapter → Visual Resources → Mind Maps → Bulk Upload → only PDFs accepted, label "Upload N Mind Map PDFs".
- Switch to Infographics tab → Bulk Upload (first click) → drop zone accepts images + PDF, label "Upload N Infographics".
- Drop a PNG on first attempt → it's accepted and uploaded.

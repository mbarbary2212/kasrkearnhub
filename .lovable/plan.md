

## Two Fixes: Algorithm Template Description + Short Questions Review Step

### 1. Algorithm Template -- Show Step Description Syntax

**File: `src/components/admin/HelpTemplatesTab.tsx` (lines 119-131)**

Update the algorithm template example to demonstrate the `step_title::step_description` syntax:
- Change the `columns` label to indicate `steps (step_title::step_description, pipe-separated)`
- Update example from plain step names to include descriptions using `::` separator
- Example: `"Obtain ECG::Order 12-lead ECG within 10 minutes of arrival|Check troponins::Serial troponin I at 0 and 3 hours|..."`

### 2. Short Questions Bulk Upload -- Add Review and Approval Step

**File: `src/components/admin/AdminContentActions.tsx`**

Replace the current simple "CSV loaded. Ready to upload." flow (lines 723-750) with a full review step matching the pattern used in `StudyBulkUploadModal`:

**New state (after line 116):**
- Add `parsedEssayRows` state: array of `{ title, question, modelAnswer, sectionId?, selected, isDuplicate, error? }`

**New parsing function:**
- Extract the CSV parsing logic from the `bulkUploadEssays` mutation into a separate `processEssayCSV(text)` function
- This function populates `parsedEssayRows` with parsed data, validation errors, and duplicate flags
- Duplicate detection: compare titles against existing essays fetched via `useQuery(['chapter-essays', chapterId])`

**Updated mutation (`bulkUploadEssays`):**
- Instead of parsing CSV text, read from the already-parsed and user-approved `parsedEssayRows`
- Only insert rows where `selected === true`

**Updated UI (lines 723-750):**
Replace the simple "CSV loaded" message with:
1. DragDropZone (keep as-is)
2. Error list if any parse errors exist
3. Duplicate summary alert (like StudyBulkUploadModal)
4. Scrollable preview list showing each parsed row with:
   - Checkbox (selected/skipped)
   - Row number, title, truncated question preview
   - Duplicate badge if title matches existing essay
   - Error badge if validation failed
5. Summary bar: "X items parsed, Y will be imported"
6. Upload button shows count of selected items

**Reset:**
- Clear `parsedEssayRows` when dialog closes or on successful upload

### Summary

| File | Change |
|---|---|
| `HelpTemplatesTab.tsx` | Update algorithm example to show `title::description` syntax |
| `AdminContentActions.tsx` | Add parsed preview, duplicate detection, per-item checkboxes for essay bulk upload |


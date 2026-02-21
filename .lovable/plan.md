

## Fix OSCE Section Support, Image Upload Text, and Add Image Button

### Issue 1: OSCE Analyzer Flags section_name/section_number as "Extra Columns"

The AI bulk upload analyzer's OSCE schema does not include `section_name` and `section_number` in its list of known columns. The actual parser in `OsceBulkUploadModal.tsx` already reads and resolves these columns correctly, but the AI analysis warns "extra columns not in database schema; these will be ignored" -- which is misleading.

**Fix in `supabase/functions/analyze-bulk-upload/index.ts` (line 70):**
- Add `section_name` and `section_number` to the OSCE schema's `optional` array

Also update the edge function `supabase/functions/bulk-import-osce/index.ts` to handle `section_name`/`section_number` columns if present (for the server-side import path), resolving them to `section_id` using a sections lookup query.

### Issue 2: Change "optional" to "you can upload later"

**Fix in `src/components/content/OsceBulkUploadModal.tsx` (line 525):**
- Change the text from:
  `image_filename is **optional**. Leave blank for questions without images.`
- To:
  `image_filename -- you can upload later. Leave blank and add images one-by-one after import.`

### Issue 3: "Add Image" Button Not Working

The "Add Image" button in `OsceQuestionCard.tsx` (line 261) requires both `isAdmin` AND `moduleId` to be truthy. Two potential fixes:

**a) Ensure the button is always visible for admins:**
The current condition `isAdmin && moduleId` is correct. The button should appear for admin users when viewing questions without images. If it's not appearing, this is likely because `moduleId` is not being passed. I will add a fallback: extract `moduleId` from the question itself (`question.module_id`) so the button always works for admins.

**b) Also add a "Replace Image" option for questions that already have an image:**
Currently, when an image exists, there is no admin option to replace it. I will add a small "Replace Image" button for admins in the image view area.

### Files to Modify

| File | Change |
|---|---|
| `supabase/functions/analyze-bulk-upload/index.ts` | Add `section_name`, `section_number` to OSCE optional columns |
| `supabase/functions/bulk-import-osce/index.ts` | Add section resolution logic using section_name/section_number |
| `src/components/content/OsceBulkUploadModal.tsx` | Change "optional" text to "you can upload later" |
| `src/components/content/OsceQuestionCard.tsx` | Use `question.module_id` as fallback for moduleId; add "Replace Image" button for admins |


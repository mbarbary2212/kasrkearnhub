

## Plan: Support CSV and Excel (.xlsx) Uploads for Flashcards

### Approach
Intercept file selection in `StudyBulkUploadModal`. If the file is `.xlsx`, parse it using the existing `readExcelToArray` from `src/lib/excel.ts`, convert the 2D array into CSV text, then feed it into the existing `processCSV` pipeline. No separate Excel import logic needed.

### Files to change

**1. `src/components/study/StudyBulkUploadModal.tsx`**
- Update `handleFileSelect` to check file extension
- For `.xlsx`: read as `ArrayBuffer`, call `readExcelToArray()`, join rows into CSV string, pass to `processCSV()`
- For `.csv`: keep existing `readAsText` flow
- Update `DragDropZone` props: `accept=".csv,.xlsx"` and `acceptedTypes={['.csv', '.xlsx']}`
- Update format help text from "CSV Format" to "CSV / Excel Format"

**2. `src/components/ui/drag-drop-zone.tsx`**
- Update default props from `.csv` to `.csv,.xlsx` (minor, mostly driven by parent props)

### How Excel → CSV conversion works
```
.xlsx file → ArrayBuffer → readExcelToArray() → string[][] → join with commas (quote fields containing commas) → CSV string → processCSV()
```

The existing `readExcelToArray` in `src/lib/excel.ts` already handles header rows and data extraction from the first sheet.

### Validation
- Same validation as CSV: `text` required, others optional, empty rows skipped
- Preview shows first N rows with missing field highlighting (already exists)
- File type and size validation handled by `DragDropZone`


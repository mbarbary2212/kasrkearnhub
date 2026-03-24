

# Fix: AI Confidence Not Showing in Card View and Not Parsed from CSV

## Problem

Two issues identified:

1. **CSV Parser doesn't recognize `ai_confidence`**: The `COLUMN_MAPPINGS` in `src/lib/csvParser.ts` has no entry for `ai_confidence` or any spelling variations. The parser never extracts the value from uploaded CSV files.

2. **Parsed data never passes `ai_confidence` to the bulk import**: Even if the column were recognized, the MCQ construction at line 529-535 of `csvParser.ts` doesn't include `ai_confidence` in the `McqFormData` object, and `McqList.tsx` doesn't forward it to the edge function.

The card view code (`McqCard.tsx` line 218) and table view code (`McqAdminTable.tsx`) are correctly wired to display `ai_confidence` — the issue is purely that the data is never saved from the CSV upload.

## Plan

### 1. Add `ai_confidence` to CSV column mappings (`src/lib/csvParser.ts`)

Add these entries to `COLUMN_MAPPINGS`:
```
'ai_confidence': 'ai_confidence',
'aiconfidence': 'ai_confidence',
'ai confidence': 'ai_confidence',
'ai_score': 'ai_confidence',
'aiscore': 'ai_confidence',
'confidence': 'ai_confidence',
```

### 2. Extract `ai_confidence` in the parser (`src/lib/csvParser.ts`)

In `parseSmartMcqCsv`, after extracting difficulty (~line 522), add:
```typescript
const aiConfidenceRaw = getValue('ai_confidence');
const aiConfidence = aiConfidenceRaw 
  ? Math.min(10, Math.max(0, parseInt(aiConfidenceRaw, 10))) 
  : null;
```

Then include `ai_confidence: isNaN(aiConfidence) ? null : aiConfidence` in the `McqFormData` object at line 529.

### 3. Pass `ai_confidence` through bulk import (`src/components/content/McqList.tsx`)

Ensure the `McqFormData` objects that include `ai_confidence` are forwarded to the `useBulkCreateMcqs` hook, which sends them to the edge function. The edge function already handles `ai_confidence` (confirmed in `supabase/functions/bulk-import-mcqs/index.ts` line 290).

### 4. Include `ai_confidence` in `McqParsedRow` export

Update the `McqParsedRow` interface and parsed row construction to carry `ai_confidence` through the pipeline.

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/csvParser.ts` | Add column mappings, extract value, include in output |
| `src/components/content/McqList.tsx` | Ensure `ai_confidence` is passed to bulk create (if not already via `McqFormData`) |


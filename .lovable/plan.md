
# Plan: Fix Batch Job Content Generation

## Problem Summary
The batch job shows "Completed" in the UI, but **no content was actually generated**. The `generate-content-from-pdf` edge function is still running an old version of `ai-provider.ts` that crashes when parsing the `gemini_model` database value.

---

## Root Cause Analysis

The logs reveal:
```
ERROR: SyntaxError: Unexpected token 'g', "gemini-1.5-flash" is not valid JSON
    at JSON.parse (<anonymous>)
    at getAISettings (file:///.../_shared/ai-provider.ts:25:56)
```

**Problem:** The database stores `gemini-1.5-flash` as a raw string, but the old code tried to `JSON.parse()` it, which fails because it's not valid JSON.

**Fix Applied (but not fully deployed):** The updated `ai-provider.ts` now checks if a string looks like JSON before parsing it.

---

## Solution

### Step 1: Redeploy All Affected Edge Functions
Redeploy the three functions that import `ai-provider.ts`:
- `generate-content-from-pdf` (primary - the one that's failing)
- `chat-with-moderation`
- `generate-vp-case`

### Step 2: Improve Error Handling in Batch Processing
Update `process-batch-job` to:
1. **Fail fast:** If all content generation fails, mark the job as "failed" instead of "completed"
2. **Track actual success:** Only mark completed if at least one job succeeded
3. **Better error messages:** Show the actual error to admins

---

## Technical Details

### Changes to `process-batch-job/index.ts`

**Current behavior (problematic):**
```typescript
// Currently marks job as "completed" even if ALL generations fail
if (!generateResponse.ok) {
  // Records failure but continues...
  continue;
}
// After loop, marks as "completed" regardless
```

**Proposed fix:**
```typescript
// Track if at least one generation succeeded
let hasSuccesses = false;

for (let i = currentStep; i < contentTypes.length; i++) {
  // ... generation code ...
  
  if (generateResult.job_id) {
    jobIds.push(generateResult.job_id);
    hasSuccesses = true;
  }
}

// Only mark completed if we had at least one success
if (hasSuccesses) {
  await serviceClient.from("ai_batch_jobs").update({
    status: "completed",
    // ...
  });
} else {
  await serviceClient.from("ai_batch_jobs").update({
    status: "failed",
    error_message: "All content generation attempts failed. Check AI settings configuration.",
  });
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/process-batch-job/index.ts` | Add success tracking & fail-fast logic |

## Functions to Redeploy

| Function | Reason |
|----------|--------|
| `generate-content-from-pdf` | Uses updated `ai-provider.ts` |
| `chat-with-moderation` | Uses updated `ai-provider.ts` |
| `generate-vp-case` | Uses updated `ai-provider.ts` |
| `process-batch-job` | After code changes |

---

## Testing

After deployment:
1. Delete the failed batch job from the UI
2. Start a new batch generation from the PDF Library
3. Verify the job completes successfully with actual content
4. Check the respective admin tables (MCQs, Flashcards, etc.) for the generated items

---

## Expected Outcome

- Batch jobs will correctly report "Failed" if no content is generated
- The `generate-content-from-pdf` function will no longer crash on AI settings
- Content will actually be created and added to the curriculum

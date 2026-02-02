
# AI Content Factory: Robust Queue Processing and Clinical Cases Fix

## Problem Summary

Based on investigation of the codebase and database, I've identified these issues:

### 1. Clinical Cases Validation Failures
The database shows clinical case generations are failing with validation errors like:
```
VP Case #1, Stage #1: stage_type must be mcq, multi_select, or short_answer
VP Case #1, Stage #1: prompt must be at least 10 characters
```

**Root Cause**: The AI is not generating the correct stage structure. The prompt schema for `clinical_case` is defined but the AI output doesn't match the expected `stages` array format. This is a prompt engineering and validation issue, not a routing issue.

### 2. Rate Limiting Issues
Recent jobs show: `Gemini API rate limit exceeded. Please try again later.`

The batch processor doesn't have delays between content types, which triggers rate limits when processing multiple items.

### 3. Silent Continuation on Failure
Current behavior (line 227-233 in `process-batch-job`):
```typescript
// Record partial failure but continue
duplicateStats[contentType] = { total: 0, unique: 0, duplicates: 0 };
continue;
```

This silently continues even when generation fails, leading to "ghost successes."

### 4. Limited Step-Level Visibility
The `ai_batch_jobs` table only stores aggregate `duplicate_stats` and `job_ids`, without per-step details like success/failure status, timestamps, or error messages.

---

## Technical Implementation Plan

### Phase 1: Database Schema Enhancement

**New `step_results` JSONB Column**

Add to `ai_batch_jobs` table:
```sql
ALTER TABLE ai_batch_jobs 
ADD COLUMN step_results JSONB DEFAULT '[]'::jsonb;
```

Structure per step:
```typescript
interface StepResult {
  content_type: string;
  step_index: number;
  started_at: string;
  finished_at: string | null;
  status: 'pending' | 'generating' | 'approving' | 'completed' | 'failed';
  generated_count: number;
  inserted_count: number;
  duplicate_count: number;
  approved_count: number;
  job_id: string | null;
  error_message: string | null;
  target_table: string;
  module_id: string;
  chapter_id: string | null;
}
```

---

### Phase 2: Strict Sequential Processing with Delays

**Updates to `process-batch-job/index.ts`**:

1. **Add inter-step delay** (2 seconds between content types to avoid rate limits):
```typescript
const STEP_DELAY_MS = 2000;

// After each successful step:
if (i < contentTypes.length - 1) {
  await new Promise(resolve => setTimeout(resolve, STEP_DELAY_MS));
}
```

2. **Stop on failure option** - Add a `stop_on_failure` flag (default: true):
```typescript
if (!generateResponse.ok) {
  // Record step failure in step_results
  stepResults.push({
    content_type: contentType,
    step_index: i,
    started_at: stepStartTime,
    finished_at: new Date().toISOString(),
    status: 'failed',
    error_message: errorMsg,
    // ...other fields
  });
  
  if (job.stop_on_failure !== false) {
    // Mark batch as failed and exit
    await updateBatchJobFailed(serviceClient, batch_id, stepResults, errorMsg);
    return jsonResponse({ ... });
  }
}
```

3. **Await approval completion before proceeding**:
```typescript
// Auto-approve if enabled
if (job.auto_approve && generateResult.job_id) {
  const approveResult = await fetch(...);
  const approveData = await approveResult.json();
  
  if (!approveResult.ok) {
    stepResult.status = 'failed';
    stepResult.error_message = `Approval failed: ${approveData.error}`;
    // Handle as failure
  } else {
    stepResult.approved_count = approveData.inserted_count || 0;
    stepResult.inserted_count = approveData.inserted_count || 0;
  }
}
```

---

### Phase 3: Clinical Case Generation Fix

**Problem**: AI generates invalid stage structures.

**Solution in `generate-content-from-pdf/index.ts`**:

1. **Enhanced Clinical Case Schema Instructions**:
```typescript
const clinicalCaseStageInfo = content_type === "clinical_case"
  ? `\n\nCRITICAL FOR CLINICAL CASES:
You MUST generate 3-5 stages in the 'stages' array. Each stage MUST have:
- stage_order: number (1, 2, 3, ...)
- stage_type: EXACTLY one of "mcq", "multi_select", or "short_answer"
- prompt: string at least 10 characters (the question/instruction)
- choices: array of {key, text} for mcq/multi_select (e.g., [{key:"A", text:"..."}, ...])
- correct_answer: "A" for mcq, ["A","B"] for multi_select, "text" for short_answer
- explanation: string explaining the answer
- teaching_points: array of strings

Example stage:
{
  "stage_order": 1,
  "stage_type": "mcq",
  "prompt": "Based on the patient's presentation, what is the most likely diagnosis?",
  "choices": [
    {"key": "A", "text": "Acute appendicitis"},
    {"key": "B", "text": "Cholecystitis"},
    {"key": "C", "text": "Pancreatitis"},
    {"key": "D", "text": "Gastroenteritis"}
  ],
  "correct_answer": "A",
  "explanation": "The classic presentation of...",
  "teaching_points": ["RLQ pain", "McBurney's point"]
}`
  : "";
```

2. **Stage Normalization Function** - Add robust fallback handling:
```typescript
function normalizeClinicalCaseStages(item: any): any {
  if (!Array.isArray(item.stages)) {
    item.stages = [];
    return item;
  }
  
  item.stages = item.stages.map((stage: any, idx: number) => ({
    stage_order: stage.stage_order || idx + 1,
    stage_type: normalizeStageType(stage.stage_type),
    prompt: stage.prompt || stage.question || stage.text || "[Missing prompt]",
    patient_info: stage.patient_info || null,
    choices: normalizeChoices(stage.choices),
    correct_answer: stage.correct_answer || stage.answer || "A",
    explanation: stage.explanation || "",
    teaching_points: ensureArray(stage.teaching_points || stage.learningPoints),
    rubric: stage.rubric || null,
  }));
  
  return item;
}

function normalizeStageType(type: string | undefined): string {
  const valid = ['mcq', 'multi_select', 'short_answer'];
  if (!type) return 'mcq';
  const lower = String(type).toLowerCase().replace(/[^a-z_]/g, '');
  if (valid.includes(lower)) return lower;
  if (lower.includes('multi')) return 'multi_select';
  if (lower.includes('short') || lower.includes('text')) return 'short_answer';
  return 'mcq';
}
```

---

### Phase 4: Batch Completion Report UI

**Updates to `AIBatchJobsList.tsx`**:

1. **Add Step Results Display**:
```typescript
{job.step_results && job.step_results.length > 0 && (
  <div>
    <h4 className="text-sm font-medium mb-2">Step Results</h4>
    <div className="space-y-2">
      {job.step_results.map((step, idx) => (
        <div key={idx} className="flex items-center justify-between p-2 bg-background rounded border">
          <div className="flex items-center gap-2">
            {step.status === 'completed' ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : step.status === 'failed' ? (
              <XCircle className="w-4 h-4 text-red-500" />
            ) : (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            <span>{CONTENT_TYPE_LABELS[step.content_type]}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {step.status === 'completed' 
              ? `${step.inserted_count} inserted`
              : step.error_message || step.status
            }
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

2. **Update TypeScript Interface**:
```typescript
interface StepResult {
  content_type: string;
  step_index: number;
  started_at: string;
  finished_at: string | null;
  status: 'pending' | 'generating' | 'approving' | 'completed' | 'failed';
  generated_count: number;
  inserted_count: number;
  error_message: string | null;
}

export interface AIBatchJob {
  // ... existing fields
  step_results?: StepResult[];
}
```

---

### Phase 5: Hook Updates

**Updates to `useAIBatchJobs.ts`**:
- Add `step_results` to the query select
- Add type casting for `step_results` JSONB

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/migrations/xxx.sql` | Add `step_results` column |
| `supabase/functions/process-batch-job/index.ts` | Strict sequential processing, delays, step tracking |
| `supabase/functions/generate-content-from-pdf/index.ts` | Enhanced clinical case prompts + normalization |
| `src/hooks/useAIBatchJobs.ts` | Add `step_results` to types and query |
| `src/components/admin/AIBatchJobsList.tsx` | Display step-level results |
| `src/integrations/supabase/types.ts` | Update generated types |

---

## Expected Behavior After Implementation

1. **Strict Queue**: Each content type waits for previous to complete (generate + approve)
2. **Rate Limit Protection**: 2-second delay between steps
3. **No Ghost Successes**: Batch marked failed if any step fails
4. **Clinical Cases Work**: Improved prompts and normalization fix validation errors
5. **Full Visibility**: Each step shows status, counts, and errors
6. **Auditable Reports**: Complete per-step history in `step_results`

---

## Testing Checklist

After implementation:
- [ ] Create batch with 2-3 content types including `clinical_case`
- [ ] Verify steps execute sequentially with visible delays
- [ ] Confirm clinical cases insert into `virtual_patient_cases`
- [ ] Check step_results shows accurate counts
- [ ] Verify failed step stops the batch
- [ ] UI displays step-level details correctly

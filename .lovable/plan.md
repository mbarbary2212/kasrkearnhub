

## Fix: Move Chunked Generation to Frontend to Avoid WORKER_LIMIT

### The Problem

The edge function tries to generate 50 MCQs by making 5 sequential AI calls (10 items each) within a single invocation. Each AI call takes ~30 seconds, so the total execution time exceeds the Supabase edge function compute limit (~150s), causing the `WORKER_LIMIT` error.

### The Solution

Split responsibilities:
- **Edge function**: Generate ONE chunk per call (up to 10 items). Fast, always completes within limits.
- **Frontend (AIContentFactoryModal)**: Orchestrates multiple sequential calls, accumulates items, runs client-side dedup, and triggers a small top-up call if needed. Shows live progress.

```text
BEFORE (single long call - times out):
  Frontend -> Edge Function [chunk1 -> chunk2 -> chunk3 -> chunk4 -> chunk5] -> TIMEOUT

AFTER (multiple short calls - each succeeds):
  Frontend -> Edge Function [chunk1] -> returns 10 items
  Frontend -> Edge Function [chunk2 + dedup context] -> returns 10 items
  Frontend -> Edge Function [chunk3 + dedup context] -> returns 10 items
  Frontend -> Edge Function [chunk4 + dedup context] -> returns 10 items
  Frontend -> Edge Function [chunk5 + dedup context] -> returns 10 items
  Frontend: merge + dedup + (optional top-up call) -> display all
```

### Changes by File

**1. `supabase/functions/generate-content-from-pdf/index.ts`**

- Remove the internal chunking loop (Phase 1-3). The function goes back to generating exactly the `quantity` requested in a SINGLE AI call.
- Cap single-call quantity at 10 (the chunk size). The frontend decides how many calls to make.
- Add a new optional parameter `dedup_fingerprints: string[]` -- the frontend passes fingerprints of previously generated items so the edge function includes them in the "DO NOT DUPLICATE" context.
- Keep all validation, normalization, NBME guidelines, section-focus, and security checks.
- Remove top-up logic (frontend handles this).
- The function creates a job row only on the FIRST call. Subsequent chunk calls receive `job_id` and append to that job.
- Add a `finalize` mode: when called with `{ job_id, action: "finalize" }`, it reads all accumulated items from the job, runs final dedup, validates, and saves the completed output.

**2. `src/components/admin/AIContentFactoryModal.tsx`**

- Implement the frontend orchestration loop:
  1. Calculate chunks needed: `Math.ceil(quantity / 10)`
  2. Call edge function for chunk 1 (creates job, returns items + job_id)
  3. Build fingerprints from returned items
  4. Call edge function for chunks 2-N, passing `job_id` + `dedup_fingerprints`
  5. Accumulate all items locally
  6. Run client-side near-duplicate removal (simple stem/front comparison)
  7. If shortfall exists, make 1-2 top-up calls (batch of 3)
  8. Call edge function with `{ job_id, action: "finalize", items: mergedItems }` to persist
- Show live progress: "Generating... (chunk 2/5, 20 items so far)"
- Handle partial failures gracefully: if chunk 3 fails, continue with chunks 4-5
- "Generate per section" mode: for each section, run the full chunk loop above

**3. `src/components/admin/AIBatchGeneratorModal.tsx`**

- No changes needed (batch jobs use a separate background worker that already handles long-running tasks).

### Technical Details

**New edge function request shape (chunk mode):**
```text
{
  document_id: string,
  content_type: string,
  module_id: string,
  chapter_id?: string,
  quantity: number,          // always <= 10 per call
  job_id?: string,           // provided for chunks 2+
  dedup_fingerprints?: string[], // fingerprints from prior chunks
  additional_instructions?: string,
  target_section_number?: string,
  action?: "generate" | "finalize"
}
```

**Finalize call:**
```text
{
  job_id: string,
  action: "finalize",
  items: any[],              // merged + deduped items from frontend
  content_type: string,
  generation_stats: { requested, raw_generated, after_dedup, chunks_used, ... }
}
```

**Frontend progress state:**
```text
generationProgress: {
  phase: "generating" | "deduplicating" | "top-up" | "finalizing",
  currentChunk: number,
  totalChunks: number,
  itemsSoFar: number,
  targetQuantity: number,
}
```

**Client-side dedup (lightweight):**
The frontend will use a simple token-overlap similarity check (not full Levenshtein) to quickly remove obvious duplicates before finalizing. The edge function's existing validation runs on the final set during finalize.

### What Stays the Same

- NBME guidelines injection (stays in edge function system prompt)
- Section-focus targeting (stays in edge function)
- All validation and normalization (runs during finalize)
- Security checks (prompt injection detection, input limits)
- Fingerprint format (key_concept + task + stem_prefix)
- Database duplicate checks (run during approval, not generation)

### Risk Mitigation

- Each edge function call completes in ~30-40s (well within limits)
- If any chunk fails, the frontend retries once, then continues with remaining chunks
- Fingerprint context grows per chunk but is capped (sent as array, not unbounded string)
- Top-up uses batches of 3 to minimize per-call token usage
- The finalize call is lightweight (just validation + DB write, no AI calls)


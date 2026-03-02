

## Speed Up `run-ai-case` — Implementation Plan

Three minimal changes to `supabase/functions/run-ai-case/index.ts`. No other files touched.

### Change 1: Parallelize READ queries (lines 348-414)

Currently sequential:
1. Case data fetch (L348-360)
2. Message history fetch (L365-371)
3. User message INSERT (L382-387) — **stays sequential**
4. AI settings (L407)
5. Content overrides (L408)
6. Cohort block (L414)

**After auth + attempt check (L335-346), run a `Promise.all` with:**
- Case data fetch
- Message history fetch
- `getAISettings(supabase)`
- `getContentTypeOverrides(supabase)`
- Cohort block — **conditional**: skip (return `""`) when `userMessage === "BEGIN_CASE"`

Then sequentially: insert user message, build prompt, call AI.

### Change 2: Conditional cohort skip (line 414)

Replace `buildCohortBlock(supabase, caseId)` in the `Promise.all` with:
```
userMessage === "BEGIN_CASE" ? Promise.resolve("") : buildCohortBlock(supabase, caseId)
```

### Change 3: Dynamic `max_tokens` (lines 439 and 541)

Compute after `maxTurns` is known:
```
const isFinalTurn = turnNumber + 1 >= maxTurns;
const maxTokensBudget = isFinalTurn ? 4096 : 800;
```

Apply `maxTokensBudget` at:
- **Streaming path** (L439): `max_tokens: maxTokensBudget`
- **Non-streaming path** (L541): `maxTokens: maxTokensBudget`

### What stays unchanged
- All prompt templates and content
- Response shape, status codes, SSE protocol
- Error handling patterns
- Function names, types, file structure
- User message INSERT remains sequential before AI call


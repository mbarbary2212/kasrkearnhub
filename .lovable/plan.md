

## Plan: Two Additions to AI Case System

### 1. Update system prompt in `run-ai-case/index.ts`

**In `buildSystemPrompt()`**, add two rules to the "YOUR ROLE AND BEHAVIOUR" section:
- "Ask exactly ONE question per turn. Do not bundle multiple questions into a single response."
- "Do not probe the same topic more than twice. If the student has answered a topic area twice (even poorly), move on to the next learning objective."

Also add to the context note injected each turn: a list of topics already probed (extracted from prior assistant messages' structured_data) so the AI has memory of what it already asked about.

**Additionally in the same file:**
- Increase `maxTokens` from 1024 to 4096 (fixes JSON truncation)
- Strip markdown code fences before JSON parsing
- After debrief, upsert `ai_case_insights` with aggregated strengths/gaps

### 2. Create `ai_case_insights` table and upsert on debrief

**New migration:**
```sql
CREATE TABLE IF NOT EXISTS ai_case_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES virtual_patient_cases(id) ON DELETE CASCADE,
  total_attempts integer DEFAULT 0,
  avg_score numeric(5,2) DEFAULT 0,
  common_strengths jsonb DEFAULT '[]'::jsonb,
  common_gaps jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(case_id)
);

ALTER TABLE ai_case_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read ai_case_insights"
  ON ai_case_insights FOR SELECT
  USING (
    is_platform_admin_or_higher(auth.uid())
    OR EXISTS (
      SELECT 1 FROM virtual_patient_cases c
      WHERE c.id = ai_case_insights.case_id
        AND (is_module_admin(auth.uid(), c.module_id))
    )
  );
```

### 3. Upsert insights after debrief in edge function

After the debrief block in `run-ai-case/index.ts`:
- Query all completed attempts for this case (scores + debrief structured_data strengths/gaps)
- Aggregate: count occurrences of each gap and strength string across all debriefs
- Take top 5 gaps and top 5 strengths by frequency
- Upsert into `ai_case_insights` with avg_score, total_attempts, common_gaps, common_strengths

### 4. Inject cohort intelligence into system prompt

In `run-ai-case/index.ts`, before calling the AI:
- Query `ai_case_insights` for this case_id
- If `total_attempts >= 3`, append a `COHORT INTELLIGENCE` section to the system prompt:
  ```
  ══════════════════════════════════════
  COHORT INTELLIGENCE (from past students)
  ══════════════════════════════════════
  {N} students have attempted this case. Average score: {X}%.
  Common gaps students miss: [list]
  Probe these areas with extra focus if the student hasn't addressed them.
  ```

### Files to modify
| File | Change |
|------|--------|
| `supabase/functions/run-ai-case/index.ts` | Update system prompt (one-question rule, no-repeat-topic rule), increase maxTokens, fix JSON parsing, inject cohort intelligence, upsert insights on debrief |
| New migration | Create `ai_case_insights` table with RLS |

No frontend changes needed for these two additions.


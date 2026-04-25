# Fix: PGRST203 on `save_question_attempt` — drop duplicate, pass confidence explicitly

## Verified problem (not assumed)

I queried `pg_proc` directly — confirmed **two functions** named `public.save_question_attempt` exist:

| pronargs | Signature |
|---|---|
| **8** | `(p_question_id uuid, p_question_type practice_question_type, p_chapter_id uuid, p_topic_id uuid, p_module_id uuid, p_selected_answer jsonb, p_is_correct boolean, p_score integer)` |
| **9** | `(... same 8 ..., p_confidence_level smallint)` ← keep |

PostgREST cannot disambiguate when the 9-arg version's last param has a default → **PGRST203**. Practice attempts fail silently (caught by Sentry but the student sees nothing).

I also read `src/hooks/useQuestionAttempts.ts` lines 270–279 — confirmed the call **does not pass `p_confidence_level` at all**.

I also read `ConfidenceCard.tsx` — confidence is written to `question_attempts` in a **separate** UPDATE statement *after* the attempt row exists. So confidence is not needed at attempt-creation time, but we should still pass it explicitly (as `null` or as the cached value if the student already chose one) to lock the call to the 9-arg signature.

---

## Changes

### 1. Database migration — drop the 8-arg duplicate

```sql
DROP FUNCTION IF EXISTS public.save_question_attempt(
  uuid,
  practice_question_type,
  uuid,
  uuid,
  uuid,
  jsonb,
  boolean,
  integer
);
```

Only the 9-arg version (with `p_confidence_level smallint DEFAULT NULL`) remains. Existing call sites that omit confidence still work because the parameter has a default — but we will also update the call site for clarity.

### 2. `src/hooks/useQuestionAttempts.ts` — pass `p_confidence_level` explicitly

- Add optional `confidenceLevel?: number | null` to `SaveQuestionAttemptParams` (line 60).
- In the `mutationFn` body (line 270), add `p_confidence_level: confidenceLevel ?? null` to the RPC call.
- Backwards compatible — existing callers don't need to pass anything; default is `null`.

### 3. (Optional, low-risk) `ConfidenceCard.tsx` — no change required

The current flow (separate UPDATE after the fact) keeps working. We are NOT refactoring it in this fix — out of scope and risks regressing the existing in-session confidence persistence.

---

## Files modified

| File | Change |
|---|---|
| `supabase/migrations/<new>.sql` | `DROP FUNCTION public.save_question_attempt(uuid, practice_question_type, uuid, uuid, uuid, jsonb, boolean, integer);` |
| `src/hooks/useQuestionAttempts.ts` | Add `confidenceLevel` to params interface; pass `p_confidence_level: confidenceLevel ?? null` in the RPC call |

No edge function changes. No RLS changes. No type regeneration needed (RPC param signature on client side already uses untyped object).

---

## Acceptance criteria

1. `SELECT proname, pronargs FROM pg_proc WHERE proname='save_question_attempt'` returns exactly **one** row with `pronargs = 9`.
2. Submitting an MCQ from the practice UI no longer throws PGRST203; `question_attempts` row is created.
3. The existing `ConfidenceCard` UPDATE flow still successfully sets `confidence_level` post-attempt.
4. No other call sites of `save_question_attempt` break (none found besides line 270).

---

## Why this is safe

- The 8-arg version is functionally a strict subset of the 9-arg one — anything it could do, the 9-arg version does identically when `p_confidence_level` is `NULL`.
- Postgres `DROP FUNCTION ... (signature)` is signature-specific — it cannot accidentally drop the 9-arg version.
- No data is touched.

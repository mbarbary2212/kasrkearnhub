

## Fix: Essay Answers Not Saving to Database

### Root Cause

The `performAutosave` function in `BlueprintExamRunner.tsx` (line 284-290) does this:

```typescript
try {
  await supabase
    .from('exam_attempt_answers')
    .upsert(rows as any, { onConflict: 'attempt_id,question_id' });
} catch (error) {
  console.error('Autosave failed:', error);
}
```

The Supabase JS client does **not throw** on API errors -- it returns `{ data, error }`. The `try/catch` only catches network failures. The upsert is returning an error in the response object that is never checked, so it silently fails. As a result, `exam_attempt_answers` has **zero rows** across all attempts. The essay marking step (`calculateScoreAndMarkEssays`) then tries to UPDATE rows that don't exist, also failing silently.

This means:
- No essay answers are saved
- No essay scores/feedback are saved
- The admin detail modal correctly shows nothing for essays (there is no data)

### Fix

**File: `src/components/exam/BlueprintExamRunner.tsx`**

1. **Fix autosave** -- Check the `.error` property from the upsert response and log it properly:

```typescript
const { error } = await supabase
  .from('exam_attempt_answers')
  .upsert(rows as any, { onConflict: 'attempt_id,question_id' });

if (error) {
  console.error('Autosave failed:', error.message);
}
```

2. **Fix final save on submit** -- In `handleSubmit`, after calling `performAutosave()`, verify rows were actually created before proceeding with essay marking. If the autosave fails, do a direct insert as a fallback to ensure data is saved on submission.

3. **Fix essay marking updates** -- In `calculateScoreAndMarkEssays`, also check the `.error` from the update calls so marking failures are surfaced.

### What This Fixes

- Future blueprint exam attempts will properly save all MCQ and essay answer rows
- Essay marking (scores, matched/missing concepts) will be persisted
- The admin detail modal will show essay results for new attempts
- Errors will be properly logged for debugging

### Important Note

Existing completed attempts have no essay data saved -- that data existed only in React state during the exam and is unrecoverable. Only future attempts will have full essay data visible to admins.

### Files Changed

| File | Change |
|------|--------|
| `src/components/exam/BlueprintExamRunner.tsx` | Fix error handling in autosave upsert, add fallback insert on submit, fix error handling in essay marking updates |

No database changes needed. The table schema and RLS policies are correct.

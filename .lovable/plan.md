

# Add `.limit(200)` safety cap to `useAllChapterQuestionAttempts`

## Change

**File:** `src/hooks/useQuestionAttempts.ts`, lines 156-160

Add `.order('created_at', { ascending: false })` and `.limit(200)` to the consolidated chapter attempts query:

```ts
const { data, error } = await supabase
  .from('question_attempts')
  .select('question_id, question_type, is_correct, selected_answer, score, status')
  .eq('user_id', user.id)
  .eq('chapter_id', chapterId)
  .order('created_at', { ascending: false })
  .limit(200);
```

## Why 200

Most chapters have 20-50 questions. Even with 3 full re-attempts that's 150 rows max. 200 gives headroom while preventing unbounded growth for edge-case users.

## Scope

One file, two lines added. No behavioral change for any realistic usage pattern.


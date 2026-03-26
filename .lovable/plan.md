

## Fix Missing Progress Tracking for True/False Questions

### Problem
The completion counter on material pills (e.g., `0/5`) does not work for **True/False** questions. The root cause is that the database RPC `get_content_progress` does not include `true_false_questions` in its aggregation, and the client-side code has no mapping for this tab.

Other tabs like SBA, Practical, and Images are hardcoded to 0 items in ChapterPage — they have no content tables or counts yet, so they're not broken, just empty.

### What's Actually Missing

| Tab | Has DB Table? | In RPC? | In `getTabCounts`? | Status |
|---|---|---|---|---|
| `true_false` | Yes (`true_false_questions`) | **No** | **No** | Broken — needs fix |
| `sba` | No (shares MCQ table) | Via mcq | Yes (maps to mcq) | OK for now |
| `practical` | Yes (`practicals`) | No | No | Count hardcoded to 0 — no content exists |
| `images` | No table | No | No | Count hardcoded to 0 — no content exists |

### Changes

**1. Database migration — Update `get_content_progress` RPC**

Add `true_false_questions` to the `content_ids` CTE and add `tf_total` / `tf_completed` fields to the returned JSON:

```sql
-- Add to content_ids CTE:
UNION ALL
SELECT 'true_false', id FROM true_false_questions
  WHERE ((p_chapter_id IS NOT NULL AND chapter_id = p_chapter_id)
      OR (p_topic_id IS NOT NULL AND topic_id = p_topic_id))
    AND NOT is_deleted

-- Add to result JSON:
'tf_total', COALESCE((SELECT cnt FROM totals WHERE qtype = 'true_false'), 0),
'tf_completed', COALESCE((SELECT cnt FROM completed WHERE qtype = 'true_false'), 0),
```

**2. `src/hooks/useChapterProgress.ts`**

- Add `tf_total` and `tf_completed` to `RpcProgressResult` interface
- Include them in `practiceTotal` / `practiceCompleted` sums
- Add `tfCompleted` / `tfTotal` to `ChapterProgressData` return type

**3. `src/hooks/useContentProgress.ts`**

- Add `tf_total` and `tf_completed` to `RpcProgressResult` interface
- Include them in `practiceTotal` / `practiceCompleted` sums

**4. `src/pages/ChapterPage.tsx`**

- Add `true_false` case to `getTabCounts` switch:
  ```typescript
  case 'true_false': 
    return { completed: chapterProgress.tfCompleted, total: chapterProgress.tfTotal || tabCount };
  ```

### Result
True/False pill will show accurate `n/total` count (e.g., `3/8`), and True/False completion will contribute to the 60% practice weight in overall progress.

### Files Changed
- 1 new SQL migration (update `get_content_progress` RPC)
- `src/hooks/useChapterProgress.ts`
- `src/hooks/useContentProgress.ts`
- `src/pages/ChapterPage.tsx`


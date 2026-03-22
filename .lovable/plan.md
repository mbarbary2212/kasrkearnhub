

# Fix FSRS Algorithm — Critical Bugs + UX Improvements

## Problem
Two critical bugs make all spaced repetition scheduling wrong for every student:
1. **State never restored correctly** — numeric state values ("0","1","2","3") saved to DB but lookup map uses string keys ("New","Learning",...), so every card resets to `State.New` on load
2. **Learning steps never persisted** — `learning_steps` hardcoded to 0, so students repeat completed learning steps

## Changes

### 1. DB Migration — Add `learning_steps` column
```sql
ALTER TABLE flashcard_states
  ADD COLUMN IF NOT EXISTS learning_steps integer NOT NULL DEFAULT 0;
```

### 2. `src/lib/fsrs.ts` — Fix `rowToCard`
- Add `learning_steps: number` to the row type parameter
- Use `row.learning_steps ?? 0` instead of hardcoded `0`
- Add `calcRetrievability(stability, daysSinceReview)` utility function for future card stats display

### 3. `src/hooks/useFSRS.ts` — Fix state serialization + persist learning_steps
- Add `STATE_NAMES` map at top: `{ 0: 'New', 1: 'Learning', 2: 'Review', 3: 'Relearning' }`
- In `useRateCard` upsert: change `state: String(newCard.state)` → `state: STATE_NAMES[newCard.state as number] ?? 'New'`
- In `useRateCard` upsert: add `learning_steps: newCard.learning_steps ?? 0`
- In `useScheduleCard` upsert: add `learning_steps: 0`

### 4. `src/components/study/FSRSRatingButtons.tsx` — Add Hard button tooltip
- Wrap the Hard button with a Tooltip: "Use only when you DID remember but it was difficult. If you forgot, press Again."

## Files Modified
| File | Change |
|------|--------|
| DB migration | Add `learning_steps` column |
| `src/lib/fsrs.ts` | Fix `rowToCard` type + add `calcRetrievability` |
| `src/hooks/useFSRS.ts` | Fix state serialization, persist `learning_steps` |
| `src/components/study/FSRSRatingButtons.tsx` | Tooltip on Hard button |


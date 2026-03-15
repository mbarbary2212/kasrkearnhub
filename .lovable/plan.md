

# Three Changes: Always-Visible Review Icon, Card Difficulty Ratings, Header Fix

## 1. Always-Visible Review Icon in Header

**Problem**: The `CalendarClock` icon only renders when `dueCount > 0`. Since all scheduled reviews have future due dates (earliest March 16), it's currently hidden.

**Fix in `MainLayout.tsx`**:
- Change condition from `(dueCount ?? 0) > 0` to just `user && !isAdmin`
- Show the icon always, but only show the red badge when `dueCount > 0`
- When no reviews are due, clicking navigates to `/review/flashcards` (which can show "no reviews due" state)

## 2. Card Difficulty Rating Buttons (Easy / Hard / Revise)

**Problem**: No difficulty rating feature exists in the codebase. The user expected three rating buttons on each flashcard.

**Solution**: Add three rating buttons below the flashcard (after flipping to the answer side). These persist to a `card_ratings` table so students can filter by difficulty later.

### Database
- Create `card_ratings` table: `id`, `user_id`, `card_id`, `rating` (enum: `easy`, `hard`, `revise`), `created_at`, with unique constraint on `(user_id, card_id)` and RLS policies

### New Hook: `src/hooks/useCardRatings.ts`
- `useCardRating(cardId)` — fetches current rating for a card
- `useRateCard()` — mutation to upsert a rating
- `useCardRatingCounts(cardIds)` — bulk fetch ratings for filtering

### UI Changes in `FlashcardsStudentView.tsx`
- After the card flips to the answer side, show three buttons below the card:
  - **Easy** (green, check icon) — "I know this well"
  - **Hard** (orange, flame icon) — "Need more practice"  
  - **Revise** (red, rotate icon) — "Review again soon"
- Tapping a rating saves it and auto-advances to next card
- Show a small colored dot/indicator on cards that have been rated
- Add keyboard shortcuts: 1 = Easy, 2 = Hard, 3 = Revise

### Filter Integration
- Add a filter option in the settings collapsible to show only cards rated "hard" or "revise"

## 3. Remove ScheduledReviewAlert from Home (cleanup)

Already done in previous edit — `Home.tsx` no longer renders it.

## Files to Change

| File | Change |
|------|--------|
| `src/components/layout/MainLayout.tsx` | Always show CalendarClock icon for students |
| `FlashcardsStudentView.tsx` | Add Easy/Hard/Revise rating buttons after flip |
| `src/hooks/useCardRatings.ts` | New hook for rating CRUD |
| Supabase migration | Create `card_ratings` table with RLS |


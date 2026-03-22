

# Remove Legacy Scheduled Reviews System

## What's Happening
The old fixed-interval review system (`scheduled_reviews` table + two hook files) is fully orphaned. All UI components already use the FSRS system. This is a clean removal with zero risk of breaking anything.

## Changes

### 1. Delete two files
- `src/hooks/useScheduledReviews.ts`
- `src/hooks/useScheduledReviewTotalCount.ts`

Neither is imported anywhere in the codebase.

### 2. DB Migration
```sql
DROP TABLE IF EXISTS scheduled_reviews;
```

### 3. No other files touched
All review UI components (`ScheduledReviewAlert`, `ScheduledReviewBanner`, `FlashcardsTab`) already use `useFSRS.ts` hooks. No imports to update.

## Files Modified
| Action | Target |
|--------|--------|
| Delete | `src/hooks/useScheduledReviews.ts` |
| Delete | `src/hooks/useScheduledReviewTotalCount.ts` |
| Migration | `DROP TABLE IF EXISTS scheduled_reviews;` |


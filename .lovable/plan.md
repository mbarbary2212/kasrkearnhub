

## Auto-Login to Preferred Year + "All Years" in Avatar Menu

### Changes

**1. `src/pages/Home.tsx` (line 65)**
- Remove the `auto_login_to_year` gate — redirect whenever `preferred_year_id` is set (change `data?.auto_login_to_year && data?.preferred_year_id` to just `data?.preferred_year_id`)

**2. `src/components/layout/MainLayout.tsx`**
- **`handleGoHome`**: Instead of always navigating to `/`, check `profile?.preferred_year_id`. If set, use `useYears` data to find the year number and navigate to `/year/{number}`. If not set, navigate to `/` as before. Still set `skipAutoLogin` to prevent double-redirect.
- **Avatar dropdown**: Add an "All Years" menu item (with `BookOpen` icon) that navigates to `/` with `skipAutoLogin` flag. Place it after the existing "Home" item.
- Import `useYears` hook and `BookOpen` icon.

### Result
- Students with a preferred year always land on that year (login, Home button, logo click)
- "All Years" in avatar menu lets them access the full year selection page
- No database changes needed




## Back Button → Dashboard + Remove Year Page

### Changes

**1. Module back button → Home (`/`)**
In `src/pages/ModulePage.tsx` line 172, change:
```typescript
onClick={() => navigate(`/year/${year?.number || 1}`)}
```
to:
```typescript
onClick={() => navigate('/')}
```

**2. Add "Browse All Years" option to the year dropdown on Home page**
In the year selector on `src/pages/Home.tsx`, add an extra option like "Browse All Years" that opens a small dialog or navigates to a dedicated simple view showing all years as cards. Alternatively, just keep the dropdown — students can already switch years from the Home dashboard dropdown, so the Year page is redundant.

**3. Remove Year page route (optional cleanup)**
In `src/App.tsx` line 140, remove or keep the `/year/:yearId` route. Keeping it won't hurt (direct links still work), but it's no longer part of the main flow.

### Summary
- Back button from module → `/` (dashboard)
- Year page is bypassed — the Home dashboard dropdown already lets students switch years
- The year dropdown on Home is the "way to see all years" the student occasionally needs
- No new pages needed


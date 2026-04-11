

## Plan: Persist Auto-Tag Results & Add Navigation Warning

### Changes to `src/components/admin/SystemAutoTagCard.tsx`

1. **Persist results to localStorage**
   - On completion, save `lastResult` + timestamp to `localStorage` key `system-auto-tag-last-result`
   - On component mount, initialize `lastResult` state from `localStorage` if available
   - This way, navigating away and back still shows the last run's report + download button

2. **Navigation warning while running**
   - Add a `useEffect` that attaches a `beforeunload` listener when `isRunning` is true
   - Browser will prompt "Are you sure you want to leave?" if user tries to navigate away during a run

3. **Show last run timestamp**
   - Display a small "Last run: [date/time]" label in the results card so it's clear when the data was generated

### No other files need changes.


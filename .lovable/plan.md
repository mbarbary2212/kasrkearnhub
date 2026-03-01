

## Plan: Add a temporary Sentry test button

Add a hidden developer tool that triggers a test error to verify Sentry is receiving events.

### Change

**File: `src/components/GlobalErrorBoundary.tsx`** — Add a `SentryTestButton` export: a small fixed button (bottom-left corner) that calls `Sentry.captureException(new Error("Sentry test error"))` and shows a toast confirmation. Only visible on the published production URL.

**File: `src/App.tsx`** — Render `<SentryTestButton />` inside the app tree.

### How to verify

1. Republish the app
2. Visit the published URL
3. Click the small "Test Sentry" button in the bottom-left corner
4. Check your Sentry dashboard — a new "Sentry test error" event should appear within a minute
5. Once confirmed working, ask me to remove the test button


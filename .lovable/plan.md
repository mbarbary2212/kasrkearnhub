

## Plan: Remove the Sentry test button

Now that Sentry is confirmed working on kalmhub.com, remove the temporary test button.

### Changes

1. **`src/components/GlobalErrorBoundary.tsx`** — Delete the `SentryTestButton` component and its related imports (`Bug` from lucide-react, `Sentry`, `toast`).

2. **`src/App.tsx`** — Remove the `SentryTestButton` import and the `<SentryTestButton />` render line.

No other files affected.




## Fix: Filter chunk load errors from Sentry reporting

### Problem
Chunk load errors after deployments are already self-healed by `ChunkLoadErrorBoundary`, but Sentry captures them before the auto-reload, creating noise that "regresses" after every deploy.

### Change
**File:** `src/lib/sentry.ts`

Add a `beforeSend` filter to the `Sentry.init()` call that drops chunk load errors (returns `null`) before they reach Sentry. These errors match messages containing:
- `Failed to fetch dynamically imported module`
- `Loading chunk`
- `ChunkLoadError`
- `Importing a module script failed`
- `error loading dynamically imported module`

The filter will safely handle cases where `originalException` is not an `Error` instance. All other errors pass through unchanged.


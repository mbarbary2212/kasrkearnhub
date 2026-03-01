

## Plan: Add Sentry DSN to the project

Sentry DSNs are **publishable keys** (they only allow sending events, not reading data), so it's safe to store directly in the codebase — no need for secrets.

### Change

**File: `.env`** — Add one line:
```
VITE_SENTRY_DSN="https://2eca26788a83ba8acd1a7bbf98493b51@o4510957724893184.ingest.de.sentry.io/4510957743374416"
```

After this, **republish** the app so the new build includes the DSN. The existing `initSentry()` code and CSP headers are already correctly configured — no other changes needed.


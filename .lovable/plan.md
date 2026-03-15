

## Fix: Exclude `.env` from version control

### Problem
`.gitignore` only excludes `*.local` — the `.env` file containing Sentry DSN and BetterStack DSN is tracked. While the Supabase anon key is designed to be public, monitoring keys should not be committed, and `.env` must be excluded to prevent accidentally committing future sensitive keys (e.g., service role keys).

### Changes

**1. Update `.gitignore`** — Add after `*.local` (line 13):
```
.env
.env.*
!.env.example
```

**2. Create `.env.example`** with placeholder values:
```
VITE_SUPABASE_PROJECT_ID="your-supabase-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-anon-key"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SENTRY_DSN="your-sentry-dsn"
VITE_BETTERSTACK_DSN="your-betterstack-dsn"
```

### Note on key rotation
Since these are `VITE_` prefixed variables, they are already embedded in the built JS bundle served to browsers — they were never truly secret. The Supabase anon key and Sentry/BetterStack DSNs are all client-side ingest endpoints designed to be public. No rotation is strictly necessary, but adding `.env` to `.gitignore` prevents future accidents with genuinely secret values.

### Note on Lovable's environment
Lovable does not use `.env` files at runtime — the values in `.env` are baked into the build. This change is purely a Git hygiene improvement for the connected GitHub repository.


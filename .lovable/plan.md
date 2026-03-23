

# Fix Cloudflare Deployment — Vite Version Conflict

## Problem
Cloudflare Pages injects `@cloudflare/vite-plugin@1.30.0` during deployment, which requires `vite@^6.1.0`. Your project uses `vite@^5.4.19`.

## Two Options

### Option A: Upgrade Vite to v6 (recommended if you want Cloudflare)
- Update `vite` from `^5.4.19` to `^6.1.0` in devDependencies
- Update `@vitejs/plugin-react-swc` to `^4.0.0` (v4 supports Vite 6)
- Update `vite-plugin-pwa` to latest compatible version
- Review `vite.config.ts` for any breaking changes

**Potential side effects:**
- Vite 6 changed the default value of `resolve.conditions` — unlikely to affect your project
- `@sentry/vite-plugin` should be compatible (v5 supports Vite 6)
- `lovable-tagger` needs to support Vite 6 — may need testing
- **Vercel impact**: Vercel uses your `package.json` Vite version directly, so it will also upgrade to Vite 6. Vite 6 is stable and widely adopted — this should work fine on Vercel, but test after deploying.

### Option B: Tell Cloudflare not to inject the plugin (simpler, no risk)
- In your Cloudflare Pages build settings, set the build command to `npm install --legacy-peer-deps && npm run build` or simply ensure Cloudflare isn't adding `@cloudflare/vite-plugin` automatically
- Alternatively, add `@cloudflare/vite-plugin` to package.json with `--legacy-peer-deps` flag

**My recommendation**: Option B first (zero risk, no code changes needed — just a Cloudflare dashboard setting). If that doesn't work, Option A.

## If you choose Option A — Changes

| File | Change |
|------|--------|
| `package.json` | `vite`: `^5.4.19` → `^6.1.0`, `@vitejs/plugin-react-swc`: `^3.11.0` → `^4.0.0` |
| `vite.config.ts` | Minimal — Vite 6 config is backward-compatible for your setup |

No other files need changes. Your Vercel deployment will also use Vite 6 after this — which is safe but should be verified with a test deploy.


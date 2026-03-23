

# Fix Cloudflare Deployment — Vite Version Conflict

## Status: DONE

Upgraded Vite from v5 to v6 to resolve `@cloudflare/vite-plugin` peer dependency conflict.

### Changes Made
| Package | Before | After |
|---------|--------|-------|
| `vite` | `^5.4.19` | `^6.1.0` (installed 6.4.1) |
| `@vitejs/plugin-react-swc` | `^3.11.0` | `^4.0.0` |
| `vite-plugin-pwa` | `^1.2.0` | latest compatible |

### Notes
- `vite.config.ts` required no changes — Vite 6 is backward-compatible for this config
- Vercel deployments will also use Vite 6 — verify with a test deploy
- Cloudflare's injected `@cloudflare/vite-plugin@1.30.0` now has its peer satisfied



## Move `@sentry/vite-plugin` to devDependencies

**Why it was wrong:** I used a dependency-add tool that defaults to `dependencies`. Since `@sentry/vite-plugin` is a build-time Vite plugin (only runs during `vite build`), it belongs in `devDependencies`.

### Change (single file: `package.json`)

1. **Remove** line 46 (`"@sentry/vite-plugin": "^5.1.1",`) from `dependencies`
2. **Add** `"@sentry/vite-plugin": "^5.1.1",` to `devDependencies` after `@eslint/js` (alphabetical order)

No other changes.


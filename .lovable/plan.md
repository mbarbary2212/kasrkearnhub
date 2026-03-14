

# Add OAuth Route Exclusion to PWA Config

The PWA service worker needs to exclude the `/~oauth` route from caching so authentication redirects always hit the network. Without this, users may experience login failures when using the installed PWA.

## Change

**`vite.config.ts`** — Add `workbox.navigateFallbackDenylist` to the VitePWA config:

```typescript
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    navigateFallbackDenylist: [/^\/~oauth/],
  },
  // ... rest of config
})
```

This is a one-line addition to ensure OAuth callbacks work correctly in the installed PWA.


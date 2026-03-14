

# Add PWA Support with KALM Hub Branded Icons

Make the app installable on mobile/tablet home screens. On desktop, it continues as a normal browser app.

## Changes

### 1. Install `vite-plugin-pwa`
Add as a dev dependency.

### 2. Copy uploaded icon to `public/`
Use the square logo (`F14993D2-70FD-4B3A-B0EF-159DB0695F95.png`) as:
- `public/pwa-192x192.png`
- `public/pwa-512x512.png`
- `public/apple-touch-icon.png`

### 3. Update `vite.config.ts`
Add `VitePWA` plugin:
- `registerType: 'autoUpdate'`
- `includeAssets: ['favicon.png', 'apple-touch-icon.png']`
- Manifest: name `"KALM Hub"`, short_name `"KALM Hub"`, theme_color `#1e3a5f`, background_color `#ffffff`, display `standalone`, icons for 192 and 512 sizes (with maskable variant)

### 4. Update `index.html`
Add `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` for iOS home screen support.

### 5. No other changes
No modifications to components, routing, styles, or logic.


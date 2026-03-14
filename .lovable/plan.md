

# PWA Install Prompt Banner for Mobile & Tablet

Add a dismissible banner that appears for mobile and tablet users (≤1024px) encouraging them to install KALM Hub to their home screen. Uses the `beforeinstallprompt` event on Android/Chrome and falls back to Safari-specific instructions on iOS.

## New File: `src/components/PWAInstallBanner.tsx`

- Listen for the `beforeinstallprompt` event (Android/Chrome) and store the event for triggering native install
- On iOS Safari, detect via `navigator.userAgent` and show manual instructions ("Tap Share → Add to Home Screen")
- Only show on viewports ≤1024px (mobile + tablet)
- Don't show if app is already installed (`display-mode: standalone` check)
- Dismissible with an X button; store dismissal in `localStorage` (`pwa-install-dismissed`) so it doesn't reappear
- Auto-expire dismissal after 7 days so users see it again periodically
- Styled as a compact bottom banner with the KALM Hub icon, a short message, and Install/Dismiss buttons

## Update: `src/App.tsx`

- Import and render `<PWAInstallBanner />` inside the provider tree (after `<AudioMiniPlayer />`)


import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { initSentry } from "./lib/sentry";
import App from "./App.tsx";
import "./index.css";
import { ChunkLoadErrorBoundary, setupChunkErrorHandler } from "./components/ChunkLoadErrorBoundary";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { setupVersionGuard, setupStartupHealthCheck, defaultHealthCheck } from "./lib/stabilityGuards";

// Vite 4.4+ native preload error handler — catches chunk failures
// at the earliest point before they propagate to other handlers
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

// Setup global chunk error handler for unhandled promise rejections
// This catches dynamic import failures before they crash the app
setupChunkErrorHandler();

// Setup version guard - reloads once if app version changed
// Prevents stale cached code from running after deploys
setupVersionGuard();

// Setup startup health check - verifies app rendered correctly after 3s
// Triggers one-time reload if core UI failed to initialize
setupStartupHealthCheck(defaultHealthCheck, 3000);

// Apply appearance preferences before first render to avoid flash
const _density = localStorage.getItem('kalm_density_preference');
if (_density === 'compact') {
  document.documentElement.classList.add('density-compact');
}
const _fontScale = localStorage.getItem('kalm_font_size');
if (_fontScale) {
  document.documentElement.style.setProperty('--app-font-scale', _fontScale);
}

// Initialize Sentry + Better Stack error monitoring (production only)
initSentry();

// Register service worker manually with error handling
// (vite-plugin-pwa injectRegister is disabled to prevent unhandled rejections)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        // Check for SW updates every 60 min
        setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
        // Also check when user returns to the tab
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {});
          }
        });
      })
      .catch(() => {
        // Silently catch — e.g. insecure context, Android restrictions
      });
  });
}

createRoot(document.getElementById("root")!).render(
  // ChunkLoadErrorBoundary: catches chunk/dynamic import failures
  // GlobalErrorBoundary: catches all other runtime errors
  // Both provide user-friendly fallback UI with recovery options
  <ChunkLoadErrorBoundary>
    <GlobalErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <App />
      </ThemeProvider>
    </GlobalErrorBoundary>
  </ChunkLoadErrorBoundary>
);

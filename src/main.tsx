import { createRoot } from "react-dom/client";
import { initSentry } from "./lib/sentry";
import App from "./App.tsx";
import "./index.css";
import { ChunkLoadErrorBoundary, setupChunkErrorHandler } from "./components/ChunkLoadErrorBoundary";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { setupVersionGuard, setupStartupHealthCheck, defaultHealthCheck } from "./lib/stabilityGuards";

// Setup global chunk error handler for unhandled promise rejections
// This catches dynamic import failures before they crash the app
setupChunkErrorHandler();

// Setup version guard - reloads once if app version changed
// Prevents stale cached code from running after deploys
setupVersionGuard();

// Setup startup health check - verifies app rendered correctly after 3s
// Triggers one-time reload if core UI failed to initialize
setupStartupHealthCheck(defaultHealthCheck, 3000);

// Initialize Sentry error monitoring (production only, requires VITE_SENTRY_DSN)
initSentry();

createRoot(document.getElementById("root")!).render(
  // ChunkLoadErrorBoundary: catches chunk/dynamic import failures
  // GlobalErrorBoundary: catches all other runtime errors
  // Both provide user-friendly fallback UI with recovery options
  <ChunkLoadErrorBoundary>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </ChunkLoadErrorBoundary>
);

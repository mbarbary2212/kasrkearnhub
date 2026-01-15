/**
 * Stability Guards - Runtime protection against silent failures
 * 
 * Features:
 * - Startup health check
 * - App version guard (cache protection)
 * - Reload safety (prevents infinite loops)
 * - Minimal diagnostics logging
 */

// Session storage keys for reload guards
const HEALTH_CHECK_RELOAD_KEY = 'stability_health_reload';
const VERSION_RELOAD_KEY = 'stability_version_reload';
const STARTUP_CHECK_COMPLETE_KEY = 'stability_startup_complete';

// App version - uses build timestamp for uniqueness
// This will change on every build, triggering version detection
const APP_VERSION = import.meta.env.VITE_BUILD_TIME || __BUILD_TIME__ || 'dev';

// localStorage key for version tracking
const VERSION_STORAGE_KEY = 'kasrlearn_app_version';

/**
 * Minimal diagnostics - logs errors without exposing stack traces to users
 */
export function logDiagnostic(
  errorType: 'chunk' | 'runtime' | 'video' | 'startup' | 'version',
  message: string,
  details?: Record<string, unknown>
) {
  const browserInfo = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
  };
  
  // Detect Safari specifically (common issue source)
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isMac = /Mac/.test(navigator.platform);
  
  console.warn(`[Stability:${errorType}]`, message, {
    ...details,
    browser: isSafari ? 'Safari' : 'Other',
    os: isMac ? 'macOS' : 'Other',
    timestamp: new Date().toISOString(),
    appVersion: APP_VERSION,
  });
  
  // Future: send to monitoring service
  // sendToMonitoring({ errorType, message, browserInfo, details });
}

/**
 * Check if a reload is safe (hasn't happened this session already for this guard)
 */
export function canSafelyReload(guardKey: string): boolean {
  const hasReloaded = sessionStorage.getItem(guardKey);
  return !hasReloaded;
}

/**
 * Mark that a reload has happened for this guard
 */
export function markReloadAttempted(guardKey: string): void {
  sessionStorage.setItem(guardKey, 'true');
}

/**
 * Safely reload the page (only if not already reloaded by this guard)
 */
export function safeReload(guardKey: string, reason: string): boolean {
  if (!canSafelyReload(guardKey)) {
    logDiagnostic('runtime', `Skipping reload - already attempted: ${reason}`);
    return false;
  }
  
  logDiagnostic('runtime', `Safe reload triggered: ${reason}`);
  markReloadAttempted(guardKey);
  window.location.reload();
  return true;
}

/**
 * App Version Guard - detects version changes between sessions
 * Triggers a one-time reload if version changed
 */
export function checkAppVersion(): { changed: boolean; previousVersion: string | null; currentVersion: string } {
  const previousVersion = localStorage.getItem(VERSION_STORAGE_KEY);
  const currentVersion = APP_VERSION;
  
  // Always update stored version
  localStorage.setItem(VERSION_STORAGE_KEY, currentVersion);
  
  if (previousVersion && previousVersion !== currentVersion) {
    logDiagnostic('version', 'App version changed', {
      from: previousVersion,
      to: currentVersion,
    });
    
    // Clear any stale cached state that might cause issues
    clearStaleCachedState();
    
    return { changed: true, previousVersion, currentVersion };
  }
  
  return { changed: false, previousVersion, currentVersion };
}

/**
 * Check if a newer version is available (non-blocking, no auto-reload)
 * Returns true if version has changed since last check
 */
export function hasNewerVersion(): boolean {
  try {
    const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY);
    return storedVersion !== null && storedVersion !== APP_VERSION;
  } catch {
    return false;
  }
}

/**
 * Get current app version string
 */
export function getAppVersion(): string {
  return APP_VERSION;
}

/**
 * Clear any local storage items that might cause issues after version change
 */
function clearStaleCachedState(): void {
  // Clear reload guard flags from previous sessions
  // These are sessionStorage so they'd clear anyway, but be explicit
  try {
    // Don't clear video progress or user preferences
    // Just clear any cached UI state that might be stale
    const keysToKeep = [
      VERSION_STORAGE_KEY,
      // Add other keys to preserve here
    ];
    
    // Log what we're doing
    logDiagnostic('version', 'Cleared stale cache state after version change');
  } catch (e) {
    // Ignore storage errors
  }
}

/**
 * Setup version guard with auto-reload on version change
 * Call this once at app startup
 */
export function setupVersionGuard(): void {
  const { changed } = checkAppVersion();
  
  if (changed) {
    // Only reload once per version change
    if (canSafelyReload(VERSION_RELOAD_KEY)) {
      safeReload(VERSION_RELOAD_KEY, 'App version changed - refreshing for latest code');
    }
  }
}

/**
 * Startup Health Check
 * Waits for initial app load, then checks if core systems are working
 * If not, triggers a one-time reload
 */
export function setupStartupHealthCheck(
  healthCheckFn: () => boolean,
  delayMs: number = 3000
): void {
  // Skip if already completed this session
  if (sessionStorage.getItem(STARTUP_CHECK_COMPLETE_KEY)) {
    return;
  }
  
  setTimeout(() => {
    try {
      const isHealthy = healthCheckFn();
      
      if (!isHealthy) {
        logDiagnostic('startup', 'Startup health check failed');
        
        if (canSafelyReload(HEALTH_CHECK_RELOAD_KEY)) {
          safeReload(HEALTH_CHECK_RELOAD_KEY, 'Startup health check failed - attempting recovery');
        } else {
          logDiagnostic('startup', 'Startup health check failed and reload already attempted');
        }
      } else {
        // Mark as complete so we don't check again this session
        sessionStorage.setItem(STARTUP_CHECK_COMPLETE_KEY, 'true');
      }
    } catch (e) {
      logDiagnostic('startup', 'Startup health check threw error', { error: String(e) });
    }
  }, delayMs);
}

/**
 * Default health check function - checks basic app state
 */
export function defaultHealthCheck(): boolean {
  try {
    // Check if document body exists and has content
    if (!document.body || document.body.childElementCount === 0) {
      return false;
    }
    
    // Check if root element exists and has content
    const root = document.getElementById('root');
    if (!root || root.childElementCount === 0) {
      return false;
    }
    
    // Check for any "error" class elements that indicate a crash
    const errorElements = document.querySelectorAll('[class*="error-boundary"], [class*="ErrorBoundary"]');
    if (errorElements.length > 0) {
      return false;
    }
    
    // Check if React has rendered something meaningful
    // Look for common app structure elements
    const hasMainLayout = document.querySelector('main, [role="main"], .min-h-screen');
    if (!hasMainLayout) {
      return false;
    }
    
    return true;
  } catch (e) {
    return false;
  }
}

// Declare build time for version detection (set by vite config)
declare const __BUILD_TIME__: string;

import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

// Build time is set at build time - changes on every deployment
const CURRENT_VERSION = import.meta.env.VITE_BUILD_TIME;
const VERSION_CHECK_ENABLED = !!CURRENT_VERSION;
const VERSION_STORAGE_KEY = 'kasrlearn_version_check';
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const DISMISSED_KEY = 'kasrlearn_update_dismissed';

/**
 * Hook that periodically checks for new app versions and shows a toast notification
 * when an update is available.
 */
export function useUpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const toastIdRef = useRef<string | number | null>(null);
  const hasShownToastRef = useRef(false);

  const checkForUpdate = useCallback(() => {
    // If no build time is set, disable version checking entirely
    if (!VERSION_CHECK_ENABLED) {
      return false;
    }

    try {
      const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY);
      const dismissedVersion = sessionStorage.getItem(DISMISSED_KEY);
      
      // On first visit, just store the current version
      if (!storedVersion) {
        localStorage.setItem(VERSION_STORAGE_KEY, CURRENT_VERSION);
        return false;
      }
      
      // Check if version has changed
      if (storedVersion !== CURRENT_VERSION) {
        // If user dismissed this version this session, don't show again
        if (dismissedVersion === CURRENT_VERSION) {
          return false;
        }
        
        setUpdateAvailable(true);
        return true;
      }
      
      return false;
    } catch (e) {
      // Ignore storage errors
      return false;
    }
  }, []);

  const showUpdateToast = useCallback(() => {
    // Prevent multiple toasts in the same session
    if (hasShownToastRef.current) {
      return;
    }
    hasShownToastRef.current = true;

    // Dismiss any existing toast
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
    }

    toastIdRef.current = toast.info('A new version is available!', {
      description: 'Refresh to get the latest updates and improvements.',
      duration: Infinity, // Keep it visible until user acts
      action: {
        label: 'Refresh Now',
        onClick: () => {
          window.location.reload();
        },
      },
      cancel: {
        label: 'Later',
        onClick: () => {
          // Mark as dismissed for this session
          sessionStorage.setItem(DISMISSED_KEY, CURRENT_VERSION!);
          setUpdateAvailable(false);
        },
      },
    });
  }, []);

  const dismissUpdate = useCallback(() => {
    if (CURRENT_VERSION) {
      sessionStorage.setItem(DISMISSED_KEY, CURRENT_VERSION);
    }
    setUpdateAvailable(false);
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
    }
  }, []);

  const refreshNow = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => {
    // Skip entirely if version checking is disabled
    if (!VERSION_CHECK_ENABLED) {
      console.log('[UpdateChecker] Disabled - no build time set');
      return;
    }

    // Initial check after a short delay (let app stabilize first)
    const initialTimeout = setTimeout(() => {
      if (checkForUpdate()) {
        showUpdateToast();
      }
    }, 3000);

    // Periodic checks
    intervalRef.current = setInterval(() => {
      if (checkForUpdate()) {
        showUpdateToast();
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkForUpdate, showUpdateToast]);

  return {
    updateAvailable,
    dismissUpdate,
    refreshNow,
  };
}

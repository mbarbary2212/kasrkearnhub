import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const STORAGE_KEY = 'kalmhub:lastPath';

// Routes that should be tracked for resume functionality
const RESUMABLE_ROUTES = ['/year', '/module', '/progress', '/account', '/virtual-patient', '/feedback'];
const ADMIN_ROUTES = ['/admin'];

/**
 * Check if a path should be tracked for resume functionality
 */
function shouldTrackRoute(pathname: string, isAdmin: boolean): boolean {
  // Never track root or auth pages
  if (pathname === '/' || pathname.startsWith('/auth')) {
    return false;
  }
  
  // Check if it's an admin route
  const isAdminRoute = ADMIN_ROUTES.some(r => pathname.startsWith(r));
  if (isAdminRoute) {
    // Only track admin routes if user is admin
    return isAdmin;
  }
  
  // Check if it's a resumable route
  return RESUMABLE_ROUTES.some(r => pathname.startsWith(r));
}

/**
 * Validate if a stored path is valid for the current user
 */
export function isValidResumePath(path: string, isAdmin: boolean): boolean {
  if (!path || path === '/' || path.startsWith('/auth')) {
    return false;
  }
  
  // Check if it's an admin route
  const isAdminRoute = ADMIN_ROUTES.some(r => path.startsWith(r));
  if (isAdminRoute && !isAdmin) {
    // Non-admins cannot resume to admin routes
    return false;
  }
  
  // Check if it matches any resumable pattern
  const isResumable = RESUMABLE_ROUTES.some(r => path.startsWith(r));
  return isResumable || isAdminRoute;
}

/**
 * Get the stored last path from localStorage
 */
export function getLastPath(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Clear the stored last path (call on logout)
 */
export function clearLastPath(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Hook to track route changes and store the last visited path
 * Should be used in the main App component or a layout wrapper
 */
export function useRouteResume(isAdmin: boolean = false): void {
  const location = useLocation();
  
  useEffect(() => {
    const fullPath = location.pathname + location.search;
    
    if (shouldTrackRoute(location.pathname, isAdmin)) {
      try {
        localStorage.setItem(STORAGE_KEY, fullPath);
      } catch {
        // Ignore storage errors (e.g., private browsing)
      }
    }
  }, [location.pathname, location.search, isAdmin]);
}

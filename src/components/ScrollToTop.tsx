import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop component
 * 
 * Scrolls to the top of the page whenever the pathname changes.
 * This fixes the issue where navigating between routes doesn't reset scroll position.
 * 
 * Must be placed inside BrowserRouter to access location context.
 */
export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Clean up stale scroll locks left by Radix UI dialogs
    document.body.removeAttribute('data-scroll-locked');
    document.body.style.removeProperty('pointer-events');
    document.body.style.removeProperty('overflow');
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
};

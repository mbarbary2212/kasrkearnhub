import { useState, useCallback, useEffect } from 'react';

const OVERLAY_CLASS = 'kalmhub-fullscreen-overlay';

export function useFullscreen(ref: React.RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enterFullscreen = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add(OVERLAY_CLASS);
    setIsFullscreen(true);
    document.body.classList.add('kalmhub-hide-nav');
  }, [ref]);

  const exitFullscreen = useCallback(() => {
    ref.current?.classList.remove(OVERLAY_CLASS);
    setIsFullscreen(false);
    document.body.classList.remove('kalmhub-hide-nav');
  }, [ref]);

  // ESC key to exit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        exitFullscreen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen, exitFullscreen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('kalmhub-hide-nav');
      ref.current?.classList.remove(OVERLAY_CLASS);
    };
  }, [ref]);

  return { isFullscreen, enterFullscreen, exitFullscreen };
}

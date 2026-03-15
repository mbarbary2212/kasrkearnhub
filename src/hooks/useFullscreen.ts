import { useState, useCallback, useEffect } from 'react';

const OVERLAY_CLASS = 'kalmhub-fullscreen-overlay';

export function useFullscreen(ref: React.RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const supportsNative = typeof document !== 'undefined' && !!document.fullscreenEnabled;

  const enterFullscreen = useCallback(async () => {
    const el = ref.current;
    if (!el) return;

    if (supportsNative) {
      try {
        await (el.requestFullscreen?.() ?? (el as any).webkitRequestFullscreen?.());
      } catch { /* ignored */ }
    } else {
      el.classList.add(OVERLAY_CLASS);
      setIsFullscreen(true);
    }
    document.body.classList.add('kalmhub-hide-nav');
  }, [ref, supportsNative]);

  const exitFullscreen = useCallback(async () => {
    if (supportsNative && document.fullscreenElement) {
      try {
        await (document.exitFullscreen?.() ?? (document as any).webkitExitFullscreen?.());
      } catch { /* ignored */ }
    }
    ref.current?.classList.remove(OVERLAY_CLASS);
    setIsFullscreen(false);
    document.body.classList.remove('kalmhub-hide-nav');
  }, [ref, supportsNative]);

  useEffect(() => {
    const handler = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (!active) {
        ref.current?.classList.remove(OVERLAY_CLASS);
        document.body.classList.remove('kalmhub-hide-nav');
      }
    };
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
    };
  }, [ref]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('kalmhub-hide-nav');
      ref.current?.classList.remove(OVERLAY_CLASS);
    };
  }, [ref]);

  return { isFullscreen, enterFullscreen, exitFullscreen };
}

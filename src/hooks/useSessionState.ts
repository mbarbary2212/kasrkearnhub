import { useEffect, useState } from 'react';

/**
 * Like useState, but persisted to sessionStorage so the value survives
 * component unmount/remount (e.g. switching admin tabs). Cleared when the
 * browser tab is closed.
 */
export function useSessionState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const raw = sessionStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore quota / serialization errors
    }
  }, [key, value]);

  return [value, setValue] as const;
}

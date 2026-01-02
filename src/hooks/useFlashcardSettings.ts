import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';

export type FlashcardMode = 'interactive' | 'slideshow';

export interface FlashcardSettings {
  mode: FlashcardMode;
  selectedTopics: string[];
  numberOfCards: string;
  intervalSeconds: number;
  shuffle: boolean;
  showMarkedOnly: boolean;
}

const DEFAULT_SETTINGS: FlashcardSettings = {
  mode: 'slideshow',
  selectedTopics: [], // Empty means "all"
  numberOfCards: '20',
  intervalSeconds: 7,
  shuffle: false,
  showMarkedOnly: false,
};

/**
 * Generates storage key for flashcard settings.
 * Uses user ID if available, otherwise falls back to anonymous key.
 */
function getStorageKey(userId?: string, chapterId?: string): string {
  const userPart = userId || 'anon';
  const chapterPart = chapterId || 'global';
  return `flashcard-settings-${userPart}-${chapterPart}`;
}

/**
 * Hook for persisting flashcard review session settings across page refreshes.
 * Settings are stored per user + chapter combination.
 */
export function useFlashcardSettings(chapterId?: string) {
  const { user } = useAuthContext();
  const storageKey = useMemo(() => getStorageKey(user?.id, chapterId), [user?.id, chapterId]);

  const [settings, setSettings] = useState<FlashcardSettings>(() => {
    // Try to load from localStorage on initial render
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return { ...DEFAULT_SETTINGS, ...parsed };
        } catch {
          // Ignore parse errors
        }
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Re-load settings when storage key changes (user or chapter changed)
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    } else {
      setSettings(DEFAULT_SETTINGS);
    }
  }, [storageKey]);

  // Persist settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [settings, storageKey]);

  // Individual setters for convenience
  const setMode = useCallback((mode: FlashcardMode) => {
    setSettings(prev => ({ ...prev, mode }));
  }, []);

  const setSelectedTopics = useCallback((topics: string[]) => {
    setSettings(prev => ({ ...prev, selectedTopics: topics }));
  }, []);

  const setNumberOfCards = useCallback((numberOfCards: string) => {
    setSettings(prev => ({ ...prev, numberOfCards }));
  }, []);

  const setIntervalSeconds = useCallback((intervalSeconds: number) => {
    setSettings(prev => ({ ...prev, intervalSeconds }));
  }, []);

  const setShuffle = useCallback((shuffle: boolean) => {
    setSettings(prev => ({ ...prev, shuffle }));
  }, []);

  const setShowMarkedOnly = useCallback((showMarkedOnly: boolean) => {
    setSettings(prev => ({ ...prev, showMarkedOnly }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return {
    settings,
    setSettings,
    setMode,
    setSelectedTopics,
    setNumberOfCards,
    setIntervalSeconds,
    setShuffle,
    setShowMarkedOnly,
    resetToDefaults,
  };
}

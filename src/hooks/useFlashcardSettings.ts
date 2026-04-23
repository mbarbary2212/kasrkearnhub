import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';

export type FlashcardMode = 'interactive' | 'cloze' | 'all';

export interface FlashcardSettings {
  mode: FlashcardMode;
  selectedTopics: string[];
  numberOfCards: string;
  intervalSeconds: number;
  shuffle: boolean;
  showMarkedOnly: boolean;
}

const DEFAULT_SETTINGS: FlashcardSettings = {
  mode: 'interactive',
  selectedTopics: [], // Empty means "all"
  numberOfCards: '20',
  intervalSeconds: 7,
  shuffle: false,
  showMarkedOnly: false,
};

/**
 * Reads the global flashcard interval default from localStorage.
 * Set by Settings → Appearance → Flashcard Behaviour.
 * Falls back to the built-in default of 7 seconds.
 */
function getGlobalDefaultInterval(): number {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.intervalSeconds;
  const stored = localStorage.getItem('kalm_flashcard_interval');
  if (!stored) return DEFAULT_SETTINGS.intervalSeconds;
  const parsed = Number(stored);
  return Number.isFinite(parsed) && parsed >= 3 && parsed <= 15
    ? parsed
    : DEFAULT_SETTINGS.intervalSeconds;
}

function buildDefaults(): FlashcardSettings {
  return { ...DEFAULT_SETTINGS, intervalSeconds: getGlobalDefaultInterval() };
}

/**
 * Generates storage key for flashcard settings.
 * Uses user ID if available, otherwise falls back to anonymous key.
 * Supports both chapterId and topicId (mutually exclusive).
 */
function getStorageKey(userId?: string, chapterId?: string, topicId?: string): string {
  const userPart = userId || 'anon';
  const containerType = chapterId ? 'chapter' : 'topic';
  const containerId = chapterId || topicId || 'global';
  return `flashcard-settings-${userPart}-${containerType}-${containerId}`;
}

/**
 * Hook for persisting flashcard review session settings across page refreshes.
 * Settings are stored per user + container (chapter or topic) combination.
 * IMPORTANT: chapterId and topicId are mutually exclusive - never pass both.
 */
export function useFlashcardSettings(params: { chapterId?: string; topicId?: string } | string = {}) {
  // Handle legacy string parameter (chapterId only)
  const { chapterId, topicId } = typeof params === 'string' 
    ? { chapterId: params, topicId: undefined }
    : params;
  
  const { user } = useAuthContext();
  const storageKey = useMemo(() => getStorageKey(user?.id, chapterId, topicId), [user?.id, chapterId, topicId]);

  const [settings, setSettings] = useState<FlashcardSettings>(() => {
    // Try to load from localStorage on initial render
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return { ...buildDefaults(), ...parsed, mode: 'interactive' as FlashcardMode };
        } catch {
          // Ignore parse errors
        }
      }
    }
    return buildDefaults();
  });

  // Re-load settings when storage key changes (user or chapter changed)
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...buildDefaults(), ...parsed, mode: 'interactive' as FlashcardMode });
      } catch {
        setSettings(buildDefaults());
      }
    } else {
      setSettings(buildDefaults());
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
    setSettings(buildDefaults());
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

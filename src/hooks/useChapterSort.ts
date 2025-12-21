import { useState, useEffect, useMemo } from 'react';

export type SortMode = 'default' | 'az' | 'za';

interface Sortable {
  title: string;
  order_index?: number;
  chapter_number?: number;
}

export function useChapterSort<T extends Sortable>(
  items: T[] | undefined,
  storageKey: string,
  initialSort: SortMode = 'default'
) {
  const [sortMode, setSortMode] = useState<SortMode>(initialSort);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey) as SortMode | null;
    if (saved === 'default' || saved === 'az' || saved === 'za') {
      setSortMode(saved);
    }
  }, [storageKey]);

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem(storageKey, sortMode);
  }, [storageKey, sortMode]);

  const sortedItems = useMemo(() => {
    if (!items) return [];
    if (sortMode === 'default') return items;
    
    const copy = [...items];
    copy.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    if (sortMode === 'za') copy.reverse();
    return copy;
  }, [items, sortMode]);

  return { sortMode, setSortMode, sortedItems };
}

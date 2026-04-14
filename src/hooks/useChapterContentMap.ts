import { useQuery } from '@tanstack/react-query';
import { fetchChapterContentMap } from '@/lib/hasChapterContent';

/**
 * React Query hook that returns Map<chapterId, boolean>
 * indicating whether each chapter has at least one content row.
 */
export function useChapterContentMap(chapterIds: string[]) {
  return useQuery({
    queryKey: ['chapter-content-map', ...chapterIds.slice().sort()],
    queryFn: () => fetchChapterContentMap(chapterIds),
    enabled: chapterIds.length > 0,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

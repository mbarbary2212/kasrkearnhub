import { useMemo } from 'react';
import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRecommendedPath, type PathRecommendation } from '@/lib/recommendedPath';
import type { ChapterStatus } from '@/lib/readiness';

interface RecommendedPathBannerProps {
  chapterStatus: ChapterStatus;
  activeSection: string;
  onNavigateSection?: (section: string) => void;
  className?: string;
}

const sectionLabels: Record<string, string> = {
  resources: 'Resources',
  interactive: 'Interactive',
  practice: 'Practice',
  test: 'Test Yourself',
};

export function RecommendedPathBanner({
  chapterStatus,
  activeSection,
  onNavigateSection,
  className,
}: RecommendedPathBannerProps) {
  const recommendation = useMemo(() => getRecommendedPath(chapterStatus), [chapterStatus]);

  // Don't show if status is unclassified
  if (!chapterStatus || chapterStatus === 'not_started') return null;

  const isOnRecommended = recommendation.recommendedSections.includes(activeSection as any);

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors',
        isOnRecommended
          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40'
          : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40',
        className,
      )}
    >
      <Lightbulb className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="flex-1 min-w-0">
        {isOnRecommended ? (
          <span className="font-medium">You're on the right track!</span>
        ) : (
          <>
            <span className="font-medium">Suggested: </span>
            {recommendation.message}
            {onNavigateSection && (
              <button
                onClick={() => onNavigateSection(recommendation.primarySection)}
                className="ml-1.5 underline underline-offset-2 hover:no-underline font-medium"
              >
                Go to {sectionLabels[recommendation.primarySection]}
              </button>
            )}
          </>
        )}
      </span>
    </div>
  );
}

/**
 * Hook-like helper: returns whether a section nav item is "recommended"
 * so the ChapterPage can add subtle emphasis.
 */
export function isRecommendedSection(
  sectionId: string,
  chapterStatus: ChapterStatus | undefined,
): boolean {
  if (!chapterStatus) return false;
  const rec = getRecommendedPath(chapterStatus);
  return rec.recommendedSections.includes(sectionId as any);
}

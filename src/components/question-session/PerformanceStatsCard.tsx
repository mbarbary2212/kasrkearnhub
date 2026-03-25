import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChapterAnalyticsSummary, useModuleAnalyticsSummary } from '@/hooks/useMcqAnalytics';

interface PerformanceStatsCardProps {
  isCorrect: boolean | null;
  wasSkipped: boolean;
  chapterId?: string;
  moduleId: string;
  chapterAccuracy: { correct: number; total: number; percentage: number } | null;
}

export function PerformanceStatsCard({
  isCorrect,
  wasSkipped,
  chapterId,
  moduleId,
  chapterAccuracy,
}: PerformanceStatsCardProps) {
  const { data: chapterStats } = useChapterAnalyticsSummary(chapterId);
  const { data: moduleStats } = useModuleAnalyticsSummary(moduleId);

  return (
    <Card>
      <CardHeader className="py-2.5 px-4">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3 px-4">
        <div className="space-y-2 text-xs">
          {/* This question */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">This question</span>
            <span className={cn(
              'font-medium flex items-center gap-1',
              wasSkipped && 'text-muted-foreground',
              !wasSkipped && isCorrect && 'text-green-600 dark:text-green-400',
              !wasSkipped && !isCorrect && 'text-red-600 dark:text-red-400',
            )}>
              {wasSkipped ? (
                <><SkipForward className="h-3 w-3" /> Skipped</>
              ) : isCorrect ? (
                <><Check className="h-3 w-3" /> Correct</>
              ) : (
                <><X className="h-3 w-3" /> Wrong</>
              )}
            </span>
          </div>

          <div className="border-t border-border" />

          {/* Chapter accuracy */}
          {chapterAccuracy && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Your chapter</span>
              <span className="font-medium text-foreground">
                {chapterAccuracy.percentage}% ({chapterAccuracy.correct}/{chapterAccuracy.total})
              </span>
            </div>
          )}

          {/* Cohort chapter average */}
          {chapterStats?.avgFacility !== null && chapterStats?.avgFacility !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Cohort chapter avg</span>
              <span className="font-medium text-foreground">
                {Math.round(chapterStats.avgFacility * 100)}%
              </span>
            </div>
          )}

          {/* Cohort module average */}
          {moduleStats?.avgFacility !== null && moduleStats?.avgFacility !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Cohort module avg</span>
              <span className="font-medium text-foreground">
                {Math.round(moduleStats.avgFacility * 100)}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

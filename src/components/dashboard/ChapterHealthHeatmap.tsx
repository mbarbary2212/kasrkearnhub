import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { classifyChapterState, type ChapterMetricsInput, type ChapterState } from '@/lib/studentMetrics';
import type { StudentChapterMetric } from '@/hooks/useStudentChapterMetrics';
import { cn } from '@/lib/utils';

interface ChapterHealthHeatmapProps {
  metrics: StudentChapterMetric[];
  chapterTitleMap: Map<string, string>;
  onChapterClick?: (chapterId: string, moduleId: string) => void;
}

const stateColors: Record<ChapterState, string> = {
  not_started: 'bg-muted',
  early: 'bg-primary/20',
  in_progress: 'bg-primary/40',
  weak: 'bg-destructive/50',
  unstable: 'bg-[hsl(var(--medical-orange))]/40',
  strong: 'bg-accent/60',
};

const stateLabels: Record<ChapterState, string> = {
  not_started: 'Not started',
  early: 'Early',
  in_progress: 'In progress',
  weak: 'Weak',
  unstable: 'Unstable',
  strong: 'Strong',
};

export function ChapterHealthHeatmap({ metrics, chapterTitleMap, onChapterClick }: ChapterHealthHeatmapProps) {
  if (metrics.length === 0) return null;

  const chapters = metrics.map(m => {
    const input: ChapterMetricsInput = {
      coverage_percent: m.coverage_percent,
      mcq_attempts: m.mcq_attempts,
      mcq_accuracy: m.mcq_accuracy,
      recent_mcq_accuracy: m.recent_mcq_accuracy,
      readiness_score: m.readiness_score,
      flashcards_due: m.flashcards_due,
      flashcards_overdue: m.flashcards_overdue,
      last_activity_at: m.last_activity_at,
      confidence_mismatch_rate: m.confidence_mismatch_rate,
    };
    const state = classifyChapterState(input);
    return {
      id: m.chapter_id,
      moduleId: m.module_id,
      title: chapterTitleMap.get(m.chapter_id) || 'Chapter',
      state,
      readiness: m.readiness_score,
    };
  });

  const legendItems: ChapterState[] = ['strong', 'in_progress', 'early', 'unstable', 'weak', 'not_started'];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-heading">Chapter Health</CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="flex flex-wrap gap-1.5">
            {chapters.map(ch => (
              <Tooltip key={ch.id}>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      'w-8 h-8 rounded-md transition-transform hover:scale-110 border border-border/50',
                      stateColors[ch.state],
                      onChapterClick && 'cursor-pointer'
                    )}
                    onClick={() => onChapterClick?.(ch.id, ch.moduleId)}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p className="font-medium">{ch.title}</p>
                  <p className="text-muted-foreground">{stateLabels[ch.state]} · {ch.readiness}% ready</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-border">
          {legendItems.map(state => (
            <div key={state} className="flex items-center gap-1.5">
              <div className={cn('w-3 h-3 rounded-sm', stateColors[state])} />
              <span className="text-[10px] text-muted-foreground">{stateLabels[state]}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

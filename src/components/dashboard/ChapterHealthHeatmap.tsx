import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { classifyFromMetrics, type ChapterStatus } from '@/lib/readiness';
import type { StudentChapterMetric } from '@/hooks/useStudentChapterMetrics';
import { cn } from '@/lib/utils';

interface ChapterHealthHeatmapProps {
  metrics: StudentChapterMetric[];
  chapterTitleMap: Map<string, string>;
  onChapterClick?: (chapterId: string, moduleId: string) => void;
}

const stateColors: Record<ChapterStatus, string> = {
  not_started: 'bg-muted',
  started: 'bg-primary/20',
  building: 'bg-primary/40',
  needs_attention: 'bg-destructive/50',
  ready: 'bg-accent/50',
  strong: 'bg-accent/60',
};

const stateLabels: Record<ChapterStatus, string> = {
  not_started: 'Not started',
  started: 'Getting Started',
  building: 'Building',
  needs_attention: 'Needs Attention',
  ready: 'Ready',
  strong: 'Strong',
};

export function ChapterHealthHeatmap({ metrics, chapterTitleMap, onChapterClick }: ChapterHealthHeatmapProps) {
  if (metrics.length === 0) return null;

  const chapters = metrics.map(m => {
    const state = classifyFromMetrics(m);
    return {
      id: m.chapter_id,
      moduleId: m.module_id,
      title: chapterTitleMap.get(m.chapter_id) || 'Chapter',
      state,
      readiness: m.readiness_score,
    };
  });

  const legendItems: ChapterStatus[] = ['strong', 'ready', 'building', 'started', 'needs_attention', 'not_started'];

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

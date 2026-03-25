import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, BookCheck, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StudentChapterMetric } from '@/hooks/useStudentChapterMetrics';
import { useState } from 'react';

interface WeeklyProgressReportProps {
  weeklyTimeMinutes: number;
  weeklyChaptersAdvanced: number;
  hasRealAccuracyData: boolean;
  metrics: StudentChapterMetric[];
  chapterTitleMap: Map<string, string>;
}

interface ChapterDelta {
  chapterId: string;
  title: string;
  delta: number; // positive = improved, negative = declined
}

export function WeeklyProgressReport({
  weeklyTimeMinutes,
  weeklyChaptersAdvanced,
  hasRealAccuracyData,
  metrics,
  chapterTitleMap,
}: WeeklyProgressReportProps) {
  const [expanded, setExpanded] = useState(false);

  // Format time
  const hours = Math.floor(weeklyTimeMinutes / 60);
  const minutes = weeklyTimeMinutes % 60;
  const timeDisplay = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  // Calculate improved/declined chapters based on recent vs overall accuracy
  const deltas: ChapterDelta[] = metrics
    .filter(m => m.mcq_attempts >= 5)
    .map(m => ({
      chapterId: m.chapter_id,
      title: chapterTitleMap.get(m.chapter_id) || 'Chapter',
      delta: Math.round(m.recent_mcq_accuracy - m.mcq_accuracy),
    }))
    .filter(d => Math.abs(d.delta) >= 5)
    .sort((a, b) => b.delta - a.delta);

  const improved = deltas.filter(d => d.delta > 0).slice(0, 3);
  const declined = deltas.filter(d => d.delta < 0).slice(0, 3);

  // Generate summary sentence
  const summaryParts: string[] = [];
  if (improved.length > 0) summaryParts.push(`${improved.length} chapter${improved.length > 1 ? 's' : ''} improved`);
  if (declined.length > 0) summaryParts.push(`${declined.length} need${declined.length > 1 ? '' : 's'} attention`);
  const summary = summaryParts.length > 0 ? summaryParts.join(', ') + '.' : 'Keep studying to generate insights.';

  return (
    <Card className="bg-muted/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-heading">Weekly Summary</CardTitle>
          {(improved.length > 0 || declined.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground text-xs"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Collapse' : 'Details'}
              <ArrowRight className={cn('w-3 h-3 ml-1 transition-transform', expanded && 'rotate-90')} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stats row */}
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">{timeDisplay}</p>
              <p className="text-xs text-muted-foreground">Study time</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BookCheck className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">{weeklyChaptersAdvanced}</p>
              <p className="text-xs text-muted-foreground">Chapters touched</p>
            </div>
          </div>
          {hasRealAccuracyData && (
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold text-foreground">{improved.length}</p>
                <p className="text-xs text-muted-foreground">Improving</p>
              </div>
            </div>
          )}
        </div>

        {/* Summary line */}
        <p className="text-xs text-muted-foreground">{summary}</p>

        {/* Expanded details */}
        {expanded && (
          <div className="space-y-3 pt-2 border-t border-border">
            {improved.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-accent mb-1.5 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Improved
                </p>
                <div className="space-y-1">
                  {improved.map(d => (
                    <div key={d.chapterId} className="flex items-center justify-between text-xs">
                      <span className="text-foreground truncate mr-2">{d.title}</span>
                      <span className="text-accent font-medium flex-shrink-0">+{d.delta}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {declined.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-destructive mb-1.5 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> Needs attention
                </p>
                <div className="space-y-1">
                  {declined.map(d => (
                    <div key={d.chapterId} className="flex items-center justify-between text-xs">
                      <span className="text-foreground truncate mr-2">{d.title}</span>
                      <span className="text-destructive font-medium flex-shrink-0">{d.delta}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

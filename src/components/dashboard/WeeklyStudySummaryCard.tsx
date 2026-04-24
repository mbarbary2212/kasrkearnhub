import { Card, CardContent } from '@/components/ui/card';
import { Clock, Video, FlaskConical, BookOpen, Stethoscope, Flame } from 'lucide-react';
import { useWeeklyStudySummary } from '@/hooks/useWeeklyStudySummary';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface WeeklyStudySummaryCardProps {
  streak?: number;
}

function fmt(seconds: number): string {
  if (seconds < 60) return '0m';
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

/**
 * Sidebar card on the Home dashboard showing the student's last-7-days
 * study activity. Aggregates only — no per-item breakdown — to stay
 * motivational rather than anxiety-inducing.
 */
export function WeeklyStudySummaryCard({ streak = 0 }: WeeklyStudySummaryCardProps) {
  const navigate = useNavigate();
  const { data, isLoading } = useWeeklyStudySummary();

  if (isLoading) return null;
  if (!data || data.totalSeconds < 60) return null; // hide if no activity

  const segments = [
    { key: 'watching', label: 'Watching', value: data.byActivity.watching, Icon: Video, cls: 'text-sky-500' },
    { key: 'practicing', label: 'Practicing', value: data.byActivity.practicing, Icon: FlaskConical, cls: 'text-amber-500' },
    { key: 'reading', label: 'Reading', value: data.byActivity.reading, Icon: BookOpen, cls: 'text-emerald-500' },
    { key: 'cases', label: 'Cases', value: data.byActivity.cases, Icon: Stethoscope, cls: 'text-purple-500' },
  ].filter(s => s.value >= 60);

  return (
    <Card>
      <CardContent className="py-3 px-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> This week
          </p>
          {streak > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
              <Flame className="w-3 h-3" /> {streak}d streak
            </span>
          )}
        </div>

        <div>
          <p className="text-base font-bold text-foreground leading-tight">
            {fmt(data.totalSeconds)} studied
          </p>
          <p className="text-[11px] text-muted-foreground">
            {data.chaptersTouched} chapter{data.chaptersTouched === 1 ? '' : 's'} touched
          </p>
        </div>

        {segments.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5">
            {segments.map(s => (
              <div key={s.key} className="flex items-center gap-1.5 text-[11px]">
                <s.Icon className={cn('w-3 h-3 flex-shrink-0', s.cls)} />
                <span className="text-muted-foreground truncate">
                  <span className="text-foreground font-medium">{fmt(s.value)}</span> {s.label.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        )}

        {data.topChapter && data.topChapter.moduleId && (
          <button
            onClick={() => {
              if (data.topChapter?.moduleId) {
                navigate(`/module/${data.topChapter.moduleId}/chapter/${data.topChapter.chapterId}`);
              }
            }}
            className="w-full text-left pt-1.5 border-t border-border/60 hover:opacity-80 transition-opacity"
            title="Open this chapter"
          >
            <p className="text-[10px] text-muted-foreground">Most time in</p>
            <p className="text-xs font-medium text-foreground truncate">{data.topChapter.title}</p>
          </button>
        )}
      </CardContent>
    </Card>
  );
}
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface StudyStreakCalendarProps {
  /** Array of ISO date strings when activity occurred */
  activityDates: string[];
  studyStreak: number;
}

export function StudyStreakCalendar({ activityDates, studyStreak }: StudyStreakCalendarProps) {
  // Build a 30-day grid
  const today = new Date();
  const days: { date: Date; dateStr: string; level: number }[] = [];

  // Count activity per day
  const dayCounts = new Map<string, number>();
  activityDates.forEach(d => {
    const key = new Date(d).toLocaleDateString('en-CA'); // YYYY-MM-DD
    dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
  });

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('en-CA');
    const count = dayCounts.get(dateStr) || 0;
    let level = 0;
    if (count >= 10) level = 4;
    else if (count >= 5) level = 3;
    else if (count >= 2) level = 2;
    else if (count >= 1) level = 1;
    days.push({ date, dateStr, level });
  }

  const levelColors = [
    'bg-muted',
    'bg-accent/30',
    'bg-accent/50',
    'bg-accent/70',
    'bg-accent',
  ];

  const formatDay = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-heading">Activity</CardTitle>
          <span className="text-xs text-muted-foreground">
            {studyStreak > 0 ? `🔥 ${studyStreak} day streak` : 'No active streak'}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="grid grid-cols-10 gap-1">
            {days.map(d => (
              <Tooltip key={d.dateStr}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'aspect-square rounded-sm transition-colors',
                      levelColors[d.level]
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p>{formatDay(d.date)}</p>
                  <p className="text-muted-foreground">
                    {dayCounts.get(d.dateStr) || 0} activities
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-3 justify-end">
          <span className="text-[10px] text-muted-foreground mr-1">Less</span>
          {levelColors.map((c, i) => (
            <div key={i} className={cn('w-3 h-3 rounded-sm', c)} />
          ))}
          <span className="text-[10px] text-muted-foreground ml-1">More</span>
        </div>
      </CardContent>
    </Card>
  );
}

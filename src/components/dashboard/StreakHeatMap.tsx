import { useMemo } from 'react';
import { format, subDays, startOfWeek, eachDayOfInterval, isToday } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Flame } from 'lucide-react';

interface DayActivity {
  date: string;
  activityCount: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface StreakHeatMapProps {
  /** Array of dates with study activity in ISO format */
  activityDates?: string[];
  /** Current streak count */
  streakDays?: number;
  className?: string;
}

// Generate activity level from count
function getActivityLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}

// Level colors matching GitHub-style heat map
const levelColors = {
  0: 'bg-muted/50',
  1: 'bg-accent/30',
  2: 'bg-accent/50',
  3: 'bg-accent/70',
  4: 'bg-accent',
};

export function StreakHeatMap({ 
  activityDates = [], 
  streakDays = 0,
  className 
}: StreakHeatMapProps) {
  // Generate 7 weeks (49 days) of data
  const heatMapData = useMemo(() => {
    const today = new Date();
    const weeksToShow = 7;
    const daysToShow = weeksToShow * 7;
    
    // Start from the beginning of the week, 7 weeks ago
    const startDate = startOfWeek(subDays(today, daysToShow - 1), { weekStartsOn: 1 });
    const endDate = today;
    
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    
    // Create a map of activity counts
    const activityMap = new Map<string, number>();
    activityDates.forEach(dateStr => {
      const key = dateStr.split('T')[0]; // Get just the date part
      activityMap.set(key, (activityMap.get(key) || 0) + 1);
    });
    
    // Generate day data
    return allDays.map(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const count = activityMap.get(dateKey) || 0;
      return {
        date: dateKey,
        activityCount: count,
        level: getActivityLevel(count),
      } as DayActivity;
    });
  }, [activityDates]);

  // Group by weeks for the grid
  const weeks = useMemo(() => {
    const result: DayActivity[][] = [];
    for (let i = 0; i < heatMapData.length; i += 7) {
      result.push(heatMapData.slice(i, i + 7));
    }
    return result;
  }, [heatMapData]);

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header with streak */}
      {streakDays > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="font-medium">{streakDays} day streak!</span>
        </div>
      )}

      {/* Heat map grid */}
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground pr-1">
          {dayLabels.map((day, i) => (
            <div key={i} className="h-3 flex items-center justify-end">
              {i % 2 === 0 ? day : ''}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <TooltipProvider delayDuration={100}>
          <div className="flex gap-0.5">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-0.5">
                {week.map((day) => {
                  const dayIsToday = isToday(new Date(day.date));
                  return (
                    <Tooltip key={day.date}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "w-3 h-3 rounded-sm transition-all cursor-default",
                            levelColors[day.level],
                            dayIsToday && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                          )}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p className="font-medium">{format(new Date(day.date), 'MMM d, yyyy')}</p>
                        <p className="text-muted-foreground">
                          {day.activityCount === 0 
                            ? 'No activity' 
                            : `${day.activityCount} activities`}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </TooltipProvider>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-0.5">
          {([0, 1, 2, 3, 4] as const).map(level => (
            <div key={level} className={cn("w-3 h-3 rounded-sm", levelColors[level])} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

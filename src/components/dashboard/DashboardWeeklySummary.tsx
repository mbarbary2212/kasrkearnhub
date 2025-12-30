import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, TrendingUp, BookCheck, ArrowRight } from 'lucide-react';

interface DashboardWeeklySummaryProps {
  weeklyTimeMinutes: number;
  weeklyAccuracyTrend: number;
  weeklyChaptersAdvanced: number;
}

export function DashboardWeeklySummary({
  weeklyTimeMinutes,
  weeklyAccuracyTrend,
  weeklyChaptersAdvanced,
}: DashboardWeeklySummaryProps) {
  // Format time
  const hours = Math.floor(weeklyTimeMinutes / 60);
  const minutes = weeklyTimeMinutes % 60;
  const timeDisplay = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  // Format trend (use neutral language)
  const trendDisplay = weeklyAccuracyTrend >= 0 
    ? `+${weeklyAccuracyTrend}%` 
    : `${weeklyAccuracyTrend}%`;
  const trendLabel = weeklyAccuracyTrend >= 0 ? 'Improving' : 'Reviewing';

  return (
    <Card className="bg-muted/30">
      <CardContent className="py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Stats */}
          <div className="flex flex-wrap gap-6">
            {/* Time studied */}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold text-foreground">{timeDisplay}</p>
                <p className="text-xs text-muted-foreground">This week</p>
              </div>
            </div>

            {/* Accuracy trend */}
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold text-foreground">{trendDisplay}</p>
                <p className="text-xs text-muted-foreground">{trendLabel}</p>
              </div>
            </div>

            {/* Chapters advanced */}
            <div className="flex items-center gap-2">
              <BookCheck className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold text-foreground">{weeklyChaptersAdvanced}</p>
                <p className="text-xs text-muted-foreground">Chapters touched</p>
              </div>
            </div>
          </div>

          {/* View Full Report Button */}
          <Button variant="ghost" size="sm" className="text-muted-foreground self-start md:self-auto">
            View Full Report
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, BookCheck, ArrowRight } from 'lucide-react';

interface DashboardWeeklySummaryProps {
  weeklyTimeMinutes: number;
  weeklyChaptersAdvanced: number;
  hasRealAccuracyData: boolean;
}

export function DashboardWeeklySummary({
  weeklyTimeMinutes,
  weeklyChaptersAdvanced,
  hasRealAccuracyData,
}: DashboardWeeklySummaryProps) {
  // Format time
  const hours = Math.floor(weeklyTimeMinutes / 60);
  const minutes = weeklyTimeMinutes % 60;
  const timeDisplay = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <Card className="bg-muted/30">
      <CardContent className="py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Stats */}
          <div className="flex flex-wrap gap-6">
            {/* Estimated time studied */}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold text-foreground">{timeDisplay}</p>
                <p className="text-xs text-muted-foreground">Estimated study time</p>
              </div>
            </div>

            {/* Chapters touched */}
            <div className="flex items-center gap-2">
              <BookCheck className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold text-foreground">{weeklyChaptersAdvanced}</p>
                <p className="text-xs text-muted-foreground">Chapters touched this week</p>
              </div>
            </div>

            {/* Accuracy trend - only show if real data exists */}
            {hasRealAccuracyData && (
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">--</p>
                  <p className="text-xs text-muted-foreground">Accuracy trend</p>
                </div>
              </div>
            )}
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

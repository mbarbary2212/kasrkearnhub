import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Activity } from 'lucide-react';
import { useCohortInsights } from '@/hooks/useStudyPlan';
import { Skeleton } from '@/components/ui/skeleton';

interface StudyPlanCohortInsightsProps {
  yearId: string | null;
  selectedYearName: string;
}

export function StudyPlanCohortInsights({ yearId, selectedYearName }: StudyPlanCohortInsightsProps) {
  const { insights, isLoading } = useCohortInsights(yearId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4" />
            Cohort Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights || insights.insufficientData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4" />
              Cohort Insights
            </CardTitle>
            <Badge variant="secondary" className="text-xs font-normal">
              {selectedYearName}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 space-y-2">
            <Users className="w-8 h-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Not enough cohort data yet.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Requires 30+ active students to show insights.
            </p>
            {insights && (
              <Badge variant="outline" className="text-xs">
                Currently: {insights.activeCount} active
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4" />
            Cohort Insights
          </CardTitle>
          <Badge variant="secondary" className="text-xs font-normal">
            Year-level • Anonymous
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="p-2 bg-primary/10 rounded-md">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold">{insights.weeklyActiveUsers}</p>
              <p className="text-xs text-muted-foreground">Active this week</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="p-2 bg-emerald-500/10 rounded-md">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-semibold">{insights.medianWeeklyItems}</p>
              <p className="text-xs text-muted-foreground">Typical items/week</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="p-2 bg-violet-500/10 rounded-md">
              <Users className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-lg font-semibold">{insights.activeCount}</p>
              <p className="text-xs text-muted-foreground">Active (14 days)</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Aggregated, anonymous data from your cohort.
        </p>
      </CardContent>
    </Card>
  );
}

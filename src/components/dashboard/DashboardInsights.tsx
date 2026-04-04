import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, TrendingUp, Clock, ShieldAlert, Target, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import type { DashboardInsight } from '@/hooks/useStudentDashboard';

interface DashboardInsightsProps {
  insights: DashboardInsight[];
  hasRealAccuracyData?: boolean;
}

const insightIconMap: Record<string, typeof AlertCircle> = {
  'Priority': Target,
  'Study Allocation': TrendingUp,
  'Trend Alert': TrendingUp,
  'Strength': CheckCircle2,
  'Confidence': ShieldAlert,
  'Time Balance': Clock,
};

const insightStyleMap: Record<DashboardInsight['type'], string> = {
  attention: 'border-amber-500/20 bg-amber-500/5',
  strong: 'border-accent/20 bg-accent/5',
  missed: 'border-border bg-muted/30',
};

const insightIconStyleMap: Record<DashboardInsight['type'], string> = {
  attention: 'text-amber-600 dark:text-amber-400',
  strong: 'text-accent',
  missed: 'text-muted-foreground',
};

export function DashboardInsights({ insights, hasRealAccuracyData = false }: DashboardInsightsProps) {
  const navigate = useNavigate();

  if (insights.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-heading">Study Coach</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, idx) => {
          const Icon = insightIconMap[insight.label] || AlertCircle;
          const cardStyle = insightStyleMap[insight.type];
          const iconStyle = insightIconStyleMap[insight.type];

          return (
            <div
              key={idx}
              className={`flex items-start gap-3 p-3 rounded-lg border ${cardStyle}`}
            >
              <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconStyle}`} />
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm text-foreground">{insight.detail}</p>
                {insight.action && (
                  <div className="flex items-center gap-1">
                    {insight.actionRoute ? (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs font-medium"
                        onClick={() => navigate(insight.actionRoute!)}
                      >
                        {insight.action}
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground font-medium">
                        💡 {insight.action}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {!hasRealAccuracyData && (
          <p className="text-xs text-muted-foreground/70 text-center italic">
            More insights will appear as you practice.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

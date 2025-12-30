import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import type { DashboardInsight } from '@/hooks/useStudentDashboard';

interface DashboardInsightsProps {
  insights: DashboardInsight[];
}

const insightConfig = {
  strong: {
    icon: CheckCircle2,
    label: 'Strong Area',
    className: 'bg-accent/10 text-accent border-accent/20',
    iconClass: 'text-accent',
  },
  attention: {
    icon: AlertCircle,
    label: 'Needs Attention',
    // Using amber/warm colors instead of red for non-judgmental feel
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  missed: {
    icon: HelpCircle,
    label: 'Frequently Missed',
    className: 'bg-muted text-muted-foreground border-border',
    iconClass: 'text-muted-foreground',
  },
};

export function DashboardInsights({ insights }: DashboardInsightsProps) {
  if (insights.length === 0) {
    return null;
  }

  // Group insights by type
  const strongAreas = insights.filter(i => i.type === 'strong');
  const needsAttention = insights.filter(i => i.type === 'attention');
  const missedConcepts = insights.filter(i => i.type === 'missed');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-heading">Learning Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {/* Strong Areas */}
          <InsightColumn
            type="strong"
            items={strongAreas}
            emptyMessage="Complete chapters to build strong areas"
          />

          {/* Needs Attention */}
          <InsightColumn
            type="attention"
            items={needsAttention}
            emptyMessage="All areas are progressing well"
          />

          {/* Frequently Missed */}
          <InsightColumn
            type="missed"
            items={missedConcepts}
            emptyMessage="No patterns identified yet"
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface InsightColumnProps {
  type: 'strong' | 'attention' | 'missed';
  items: DashboardInsight[];
  emptyMessage: string;
}

function InsightColumn({ type, items, emptyMessage }: InsightColumnProps) {
  const config = insightConfig[type];
  const Icon = config.icon;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${config.iconClass}`} />
        <span className="text-sm font-medium text-foreground">{config.label}</span>
      </div>
      
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-lg border ${config.className}`}
            >
              <p className="text-sm font-medium">{item.label}</p>
              {item.detail && (
                <p className="text-xs opacity-80 mt-0.5">{item.detail}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">{emptyMessage}</p>
      )}
    </div>
  );
}

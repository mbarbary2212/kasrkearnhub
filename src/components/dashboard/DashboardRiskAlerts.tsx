import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import type { RiskAlert } from '@/lib/studentMetrics/buildRiskAlerts';

interface DashboardRiskAlertsProps {
  alerts: RiskAlert[];
}

export function DashboardRiskAlerts({ alerts }: DashboardRiskAlertsProps) {
  const navigate = useNavigate();

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-start gap-3 px-3.5 py-2.5 rounded-lg border text-sm ${
            alert.severity === 'high'
              ? 'border-destructive/30 bg-destructive/5'
              : 'border-amber-500/30 bg-amber-500/5'
          }`}
        >
          <AlertTriangle
            className={`w-4 h-4 mt-0.5 shrink-0 ${
              alert.severity === 'high'
                ? 'text-destructive'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          />
          <div className="flex-1 min-w-0">
            <span className="text-foreground">{alert.message}</span>
            {alert.action && (
              <>
                {' · '}
                {alert.actionRoute ? (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs font-medium inline-flex items-center gap-0.5"
                    onClick={() => navigate(alert.actionRoute!)}
                  >
                    {alert.action}
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground font-medium">{alert.action}</span>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

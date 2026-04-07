import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain } from 'lucide-react';
import type { CaseReasoningProfile, ReasoningDomainScore } from '@/hooks/useCaseReasoningProfile';

interface ClinicalThinkingPanelProps {
  profile: CaseReasoningProfile;
}

function getStrengthColor(pct: number): string {
  if (pct >= 70) return 'bg-green-500';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

function getStrengthLabel(pct: number): string {
  if (pct >= 70) return 'Strong';
  if (pct >= 50) return 'Average';
  return 'Weak';
}

function DomainBar({ domain }: { domain: ReasoningDomainScore }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground font-medium">{domain.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{domain.attemptCount} attempts</span>
          <Badge variant="outline" className="text-xs px-1.5 py-0">
            {getStrengthLabel(domain.avgPercentage)}
          </Badge>
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getStrengthColor(domain.avgPercentage)}`}
          style={{ width: `${Math.min(100, domain.avgPercentage)}%` }}
        />
      </div>
      {domain.criticalMissRate > 30 && (
        <p className="text-xs text-destructive">
          ⚠ {domain.criticalMissRate}% critical miss rate
        </p>
      )}
      {domain.trend === 'improving' && (
        <p className="text-xs text-green-600">↗ Improving</p>
      )}
      {domain.trend === 'declining' && (
        <p className="text-xs text-destructive">↘ Declining</p>
      )}
    </div>
  );
}

export function ClinicalThinkingPanel({ profile }: ClinicalThinkingPanelProps) {
  // Only show if ≥ 5 total attempts
  if (profile.totalAttempts < 5) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          Clinical Thinking Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>Overall: {profile.overallAvgPercentage}%</span>
          <span>{profile.totalAttempts} case answers</span>
        </div>
        {profile.domains.map(domain => (
          <DomainBar key={domain.domain} domain={domain} />
        ))}
        {profile.domains.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            No reasoning domain data yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

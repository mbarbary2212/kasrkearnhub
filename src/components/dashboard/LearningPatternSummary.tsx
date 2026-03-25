import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, HelpCircle, Shield, Trophy } from 'lucide-react';
import { classifyLearningPattern, type LearningPattern } from '@/lib/studentMetrics';
import type { StudentChapterMetric } from '@/hooks/useStudentChapterMetrics';
import { cn } from '@/lib/utils';

interface LearningPatternSummaryProps {
  metrics: StudentChapterMetric[];
}

const patternConfig: Record<LearningPattern, {
  icon: React.ElementType;
  label: string;
  colorClass: string;
  bgClass: string;
}> = {
  misconception: {
    icon: AlertTriangle,
    label: 'Misconceptions',
    colorClass: 'text-destructive',
    bgClass: 'bg-destructive/10',
  },
  hesitant: {
    icon: HelpCircle,
    label: 'Hesitant',
    colorClass: 'text-[hsl(var(--medical-orange))]',
    bgClass: 'bg-[hsl(var(--medical-orange))]/10',
  },
  fragile: {
    icon: Shield,
    label: 'Fragile',
    colorClass: 'text-[hsl(var(--medical-purple))]',
    bgClass: 'bg-[hsl(var(--medical-purple))]/10',
  },
  mastering: {
    icon: Trophy,
    label: 'Mastering',
    colorClass: 'text-accent',
    bgClass: 'bg-accent/10',
  },
  unclear: {
    icon: HelpCircle,
    label: 'Unclear',
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted',
  },
};

export function LearningPatternSummary({ metrics }: LearningPatternSummaryProps) {
  // Classify all chapters with enough data
  const patterns = metrics
    .filter(m => m.mcq_attempts >= 5)
    .map(m => classifyLearningPattern(m))
    .filter(p => p.pattern !== 'unclear');

  if (patterns.length === 0) return null;

  // Count by pattern
  const counts = patterns.reduce((acc, p) => {
    acc[p.pattern] = (acc[p.pattern] || 0) + 1;
    return acc;
  }, {} as Record<LearningPattern, number>);

  const displayOrder: LearningPattern[] = ['misconception', 'hesitant', 'fragile', 'mastering'];
  const items = displayOrder
    .filter(p => counts[p] > 0)
    .map(p => ({ pattern: p, count: counts[p] }));

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-heading">Learning Patterns</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {items.map(({ pattern, count }) => {
            const config = patternConfig[pattern];
            const Icon = config.icon;
            return (
              <div
                key={pattern}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg',
                  config.bgClass,
                )}
              >
                <Icon className={cn('w-5 h-5 flex-shrink-0', config.colorClass)} />
                <div>
                  <p className={cn('text-lg font-bold font-heading', config.colorClass)}>{count}</p>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          Based on {patterns.length} chapter{patterns.length > 1 ? 's' : ''} with sufficient practice data
        </p>
      </CardContent>
    </Card>
  );
}

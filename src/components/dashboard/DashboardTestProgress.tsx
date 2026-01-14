import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTestProgress } from '@/hooks/useTestProgress';
import { AskCoachButton } from '@/components/coach';
import { 
  FileQuestion, 
  Stethoscope, 
  MessageCircleQuestion, 
  TrendingUp, 
  TrendingDown,
  Lightbulb,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardTestProgressProps {
  moduleId?: string;
}

export function DashboardTestProgress({ moduleId }: DashboardTestProgressProps) {
  const { data: progress, isLoading } = useTestProgress(moduleId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5 text-primary" />
            Test Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!progress?.hasAnyAttempts) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5 text-primary" />
            Test Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 space-y-3">
            <p className="text-muted-foreground text-sm">
              No test attempts yet. Complete some practice questions to see your performance here.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Lightbulb className="w-4 h-4 text-primary" />
              <span>Need guidance? Ask your Study Coach for help getting started!</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { mcq, osce, conceptCheck } = progress;

  // Determine if student needs help (struggling)
  const needsHelp = 
    (mcq.attempts > 0 && mcq.accuracy < 60) || 
    (osce.attempts > 0 && osce.avgScore < 3) || 
    (conceptCheck.total > 0 && conceptCheck.passRate < 50);

  const getPerformanceColor = (value: number, type: 'percent' | 'score') => {
    if (type === 'percent') {
      if (value >= 80) return 'text-green-600 dark:text-green-400';
      if (value >= 60) return 'text-amber-600 dark:text-amber-400';
      return 'text-red-600 dark:text-red-400';
    } else {
      // For OSCE score out of 5
      if (value >= 4) return 'text-green-600 dark:text-green-400';
      if (value >= 3) return 'text-amber-600 dark:text-amber-400';
      return 'text-red-600 dark:text-red-400';
    }
  };

  const renderTrend = (change: number, suffix: string = '%') => {
    if (change === 0) return null;
    const isPositive = change > 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    return (
      <span className={cn(
        "inline-flex items-center gap-0.5 text-xs",
        isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
      )}>
        <Icon className="w-3 h-3" />
        {isPositive ? '+' : ''}{change}{suffix}
      </span>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="w-5 h-5 text-primary" />
          Test Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Performance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* MCQ Performance */}
          <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-2">
              <FileQuestion className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">MCQ</span>
            </div>
            {mcq.attempts > 0 ? (
              <>
                <span className={cn("text-2xl font-bold", getPerformanceColor(mcq.accuracy, 'percent'))}>
                  {mcq.accuracy}%
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  {mcq.attempts} attempts
                </span>
                {renderTrend(mcq.weeklyChange)}
              </>
            ) : (
              <span className="text-sm text-muted-foreground">No attempts</span>
            )}
          </div>

          {/* OSCE Performance */}
          <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-2">
              <Stethoscope className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">OSCE</span>
            </div>
            {osce.attempts > 0 ? (
              <>
                <span className={cn("text-2xl font-bold", getPerformanceColor(osce.avgScore, 'score'))}>
                  {osce.avgScore}/5
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  {osce.attempts} attempts
                </span>
                {renderTrend(osce.weeklyChange, '')}
              </>
            ) : (
              <span className="text-sm text-muted-foreground">No attempts</span>
            )}
          </div>

          {/* Concept Check Performance */}
          <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircleQuestion className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Concept Check</span>
            </div>
            {conceptCheck.total > 0 ? (
              <>
                <span className={cn("text-2xl font-bold", getPerformanceColor(conceptCheck.passRate, 'percent'))}>
                  {conceptCheck.passRate}%
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  {conceptCheck.passed}/{conceptCheck.total} passed
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">No attempts</span>
            )}
          </div>
        </div>

        {/* Coach Guidance Prompt */}
        {needsHelp && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Lightbulb className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Need some guidance?</p>
              <p className="text-xs text-muted-foreground">
                Your Study Coach can help explain difficult concepts and suggest study strategies.
              </p>
            </div>
            <AskCoachButton 
              variant="chip"
              context={{ pageType: 'practice', moduleId }}
              initialMessage="I'm having trouble with some practice questions. Can you help me understand the key concepts better?"
            />
          </div>
        )}

        {/* Encouragement for good performers */}
        {!needsHelp && progress.hasAnyAttempts && (
          <div className="text-center text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              ✨ Keep up the great work! Visit your Study Coach anytime for deeper explanations.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

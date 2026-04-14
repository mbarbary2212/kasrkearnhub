import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ClipboardList, ArrowRight, CheckCircle2, Info } from 'lucide-react';
import { useStudentGoals, computeGoalsProgress } from '@/hooks/useStudentGoals';

interface CoachPlanTabProps {
  onSwitchToGoals: () => void;
}

export function CoachPlanTab({ onSwitchToGoals }: CoachPlanTabProps) {
  const { data: goals, isLoading } = useStudentGoals();
  const progress = computeGoalsProgress(goals ?? null);

  if (isLoading) {
    return <div className="animate-pulse space-y-4"><div className="h-40 bg-muted rounded-lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" />
            Your Study Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your personalized daily plan is built from your goals, your exam schedule, and the content blueprint for each module.
          </p>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Goals setup</span>
              <span className="text-xs font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Conditional content based on progress */}
          {progress === 0 && (
            <div className="flex gap-3 p-4 rounded-lg border border-border bg-muted/30">
              <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm text-foreground">
                  You haven't set up your goals yet — that's fine. Below is a recommended starting point based on your activity and module content.
                </p>
                <p className="text-xs text-muted-foreground">
                  Your daily plan on the Dashboard adapts to what you study and what's coming up. Setting goals makes it more precise.
                </p>
                <Button variant="outline" size="sm" onClick={onSwitchToGoals}>
                  Set up your goals <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {progress > 0 && progress < 60 && (
            <div className="flex gap-3 p-4 rounded-lg border border-primary/20 bg-primary/5">
              <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm text-foreground">
                  Your goals are partially set. Complete them to get the most accurate study plan.
                </p>
                <Button variant="outline" size="sm" onClick={onSwitchToGoals}>
                  Finish setting up your goals <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {progress >= 60 && progress < 100 && (
            <div className="flex gap-3 p-4 rounded-lg border border-primary/20 bg-primary/5">
              <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm text-foreground">
                  Almost there! A few more details will sharpen your plan further.
                </p>
                <Button variant="outline" size="sm" onClick={onSwitchToGoals}>
                  Complete your goals <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {progress === 100 && (
            <div className="flex gap-3 p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">
                Your goals are set. Your plan updates daily based on what you study and what's coming up in your exam schedule.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

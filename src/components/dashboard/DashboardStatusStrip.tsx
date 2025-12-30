import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { TrendingUp, BookOpen, Calendar } from 'lucide-react';

interface DashboardStatusStripProps {
  examReadiness: number;
  coverageCompleted: number;
  coverageTotal: number;
  studyStreak: number;
}

export function DashboardStatusStrip({
  examReadiness,
  coverageCompleted,
  coverageTotal,
  studyStreak,
}: DashboardStatusStripProps) {
  const coveragePercent = coverageTotal > 0 
    ? Math.round((coverageCompleted / coverageTotal) * 100) 
    : 0;

  return (
    <Card className="p-4 md:p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Exam Readiness */}
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-heading font-bold text-foreground">
                {examReadiness}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Exam Readiness
            </p>
            <p className="text-xs text-muted-foreground/70">
              Based on coverage, accuracy, and consistency
            </p>
          </div>
        </div>

        {/* Coverage Progress */}
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-heading font-semibold text-foreground">
                Coverage
              </span>
              <span className="text-sm text-muted-foreground">
                {coveragePercent}%
              </span>
            </div>
            <Progress value={coveragePercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1.5">
              {coverageCompleted} of {coverageTotal} chapters completed
            </p>
          </div>
        </div>

        {/* Study Streak */}
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
            <Calendar className="w-6 h-6 text-secondary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-heading font-bold text-foreground">
                {studyStreak}
              </span>
              <span className="text-sm text-muted-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Study Streak
            </p>
            <p className="text-xs text-muted-foreground/70">
              {studyStreak > 0 ? 'Keep it going!' : 'Start today'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

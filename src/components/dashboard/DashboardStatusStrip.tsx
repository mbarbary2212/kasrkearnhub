import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { TrendingUp, BookOpen, Calendar, Info, AlertTriangle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  type ReadinessResult, 
  getCapMessage,
  READINESS_WEIGHTS,
} from '@/lib/readinessCalculator';
import { ReadinessTrendSparkline } from './ReadinessTrendSparkline';
import type { ExamReadinessIndicator } from '@/lib/studentMetrics';

interface DashboardStatusStripProps {
  examReadiness: number;
  coveragePercent: number;
  coverageCompleted: number;
  coverageTotal: number;
  chaptersStarted: number;
  chaptersTotal: number;
  studyStreak: number;
  readinessResult?: ReadinessResult;
  readinessTrend?: number[];
}

export function DashboardStatusStrip({
  examReadiness,
  coveragePercent,
  coverageCompleted,
  coverageTotal,
  chaptersStarted,
  chaptersTotal,
  studyStreak,
  readinessResult,
  readinessTrend,
}: DashboardStatusStripProps) {
  const capMessage = readinessResult?.cap ? getCapMessage(readinessResult.cap) : null;
  const hasDetailedBreakdown = !!readinessResult;

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
              {readinessTrend && readinessTrend.length >= 2 && (
                <ReadinessTrendSparkline dataPoints={readinessTrend} className="ml-1" />
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs p-3">
                    {hasDetailedBreakdown ? (
                      <div className="space-y-2 text-sm">
                        <p className="font-medium">Readiness Breakdown:</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>Coverage ({Math.round(READINESS_WEIGHTS.coverage * 100)}%)</span>
                            <span className="font-mono">{readinessResult.components.coverage}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Performance ({Math.round(READINESS_WEIGHTS.performance * 100)}%)</span>
                            <span className="font-mono">{readinessResult.components.performance}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Improvement ({Math.round(READINESS_WEIGHTS.improvement * 100)}%)</span>
                            <span className="font-mono">{readinessResult.components.improvement}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Consistency ({Math.round(READINESS_WEIGHTS.consistency * 100)}%)</span>
                            <span className="font-mono">{readinessResult.components.consistency}%</span>
                          </div>
                        </div>
                        {capMessage && (
                          <div className="flex items-start gap-1.5 pt-2 border-t text-xs text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{capMessage}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm">
                        Readiness reflects preparedness based on coverage, performance, improvement, and consistency.
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Exam Readiness
            </p>
            {capMessage ? (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Capped
              </p>
            ) : (
              <p className="text-xs text-muted-foreground/70">
                Based on coverage, performance & consistency
              </p>
            )}
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
              {coverageCompleted} of {coverageTotal} items completed
            </p>
            {chaptersTotal > 0 && (
              <p className="text-xs text-muted-foreground/70">
                {chaptersStarted} of {chaptersTotal} chapters started
              </p>
            )}
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
